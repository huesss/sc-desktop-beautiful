use deadpool_postgres::{Config as PgConfig, Pool, Runtime};
use tokio_postgres::NoTls;
use tracing::info;
use uuid::Uuid;

use crate::config::Config;

#[derive(Debug, thiserror::Error)]
pub enum PgError {
    #[error("pool: {0}")]
    Pool(#[from] deadpool_postgres::PoolError),
    #[error("db: {0}")]
    Postgres(#[from] tokio_postgres::Error),
}

#[derive(Clone)]
pub struct PgPool {
    pool: Pool,
}

#[derive(Debug)]
pub struct SessionInfo {
    pub access_token: String,
    pub soundcloud_user_id: Option<String>,
}

#[derive(Debug)]
pub struct CdnTrackRecord {
    pub id: String,
    pub track_urn: String,
    pub status: String,
}

impl PgPool {
    pub async fn connect(config: &Config) -> Result<Self, Box<dyn std::error::Error>> {
        let mut pg = PgConfig::new();
        pg.host = Some(config.database_host.clone());
        pg.port = Some(config.database_port);
        pg.user = Some(config.database_username.clone());
        pg.password = Some(config.database_password.clone());
        pg.dbname = Some(config.database_name.clone());

        let pool = pg.create_pool(Some(Runtime::Tokio1), NoTls)?;

        let client = pool.get().await?;
        client.execute("SELECT 1", &[]).await?;
        info!("PostgreSQL connected");

        Ok(Self { pool })
    }

    pub async fn get_session(&self, session_id: &str) -> Result<Option<SessionInfo>, PgError> {
        let Ok(session_id) = Uuid::parse_str(session_id) else {
            return Ok(None);
        };
        let client = self.pool.get().await?;
        let row = client
            .query_opt(
                r#"SELECT access_token, soundcloud_user_id FROM sessions WHERE id = $1"#,
                &[&session_id],
            )
            .await?;

        Ok(row.map(|r| SessionInfo {
            access_token: r.get(0),
            soundcloud_user_id: r.get(1),
        }))
    }

    pub async fn find_cached_track(
        &self,
        track_urn: &str,
    ) -> Result<Option<CdnTrackRecord>, PgError> {
        let client = self.pool.get().await?;
        let row = client
            .query_opt(
                r#"SELECT id, track_urn, status
                   FROM cdn_tracks
                   WHERE track_urn = $1 AND quality = 'single' AND status = 'ok'"#,
                &[&track_urn],
            )
            .await?;
        Ok(row.as_ref().map(row_to_cdn_track))
    }

    pub async fn update_last_accessed(&self, id: &str) -> Result<(), PgError> {
        let client = self.pool.get().await?;
        client
            .execute(
                r#"UPDATE cdn_tracks SET last_accessed_at = NOW() WHERE id = $1::text::uuid"#,
                &[&id],
            )
            .await?;
        Ok(())
    }

    pub async fn insert_cdn_track(
        &self,
        track_urn: &str,
        cdn_path: &str,
        status: &str,
    ) -> Result<String, PgError> {
        let id = Uuid::now_v7().to_string();
        let quality = "single";
        let client = self.pool.get().await?;
        client
            .execute(
                r#"INSERT INTO cdn_tracks (id, track_urn, quality, cdn_path, status, created_at, updated_at, last_accessed_at)
                   VALUES ($1::text::uuid, $2, $3, $4, $5, NOW(), NOW(), NOW())
                   ON CONFLICT (track_urn, quality) DO UPDATE SET status = $5, cdn_path = $4, updated_at = NOW()"#,
                &[&id, &track_urn, &quality, &cdn_path, &status],
            )
            .await?;
        Ok(id)
    }

    pub async fn update_cdn_track_status(&self, id: &str, status: &str) -> Result<(), PgError> {
        let client = self.pool.get().await?;
        client
            .execute(
                r#"UPDATE cdn_tracks SET status = $2, updated_at = NOW() WHERE id = $1::text::uuid"#,
                &[&id, &status],
            )
            .await?;
        Ok(())
    }

    pub async fn get_stale_cdn_tracks(
        &self,
        older_than_days: u64,
    ) -> Result<Vec<CdnTrackRecord>, PgError> {
        let client = self.pool.get().await?;
        let interval = format!("{older_than_days} days");
        let rows = client
            .query(
                r#"SELECT id, track_urn, status
                   FROM cdn_tracks
                   WHERE status = 'ok'
                     AND last_accessed_at < NOW() - $1::interval
                   ORDER BY last_accessed_at ASC"#,
                &[&interval],
            )
            .await?;

        Ok(rows.iter().map(row_to_cdn_track).collect())
    }

    pub async fn get_cdn_tracks_oldest_first(
        &self,
        limit: i64,
    ) -> Result<Vec<CdnTrackRecord>, PgError> {
        let client = self.pool.get().await?;
        let rows = client
            .query(
                r#"SELECT id, track_urn, status
                   FROM cdn_tracks
                   WHERE status = 'ok'
                   ORDER BY last_accessed_at ASC
                   LIMIT $1"#,
                &[&limit],
            )
            .await?;

        Ok(rows.iter().map(row_to_cdn_track).collect())
    }

    pub async fn delete_cdn_track(&self, id: &str) -> Result<(), PgError> {
        let client = self.pool.get().await?;
        client
            .execute("DELETE FROM cdn_tracks WHERE id = $1::text::uuid", &[&id])
            .await?;
        Ok(())
    }

    pub async fn get_random_valid_sessions(
        &self,
        limit: i64,
        exclude_token: &str,
    ) -> Result<Vec<String>, PgError> {
        let client = self.pool.get().await?;
        let rows = client
            .query(
                r#"SELECT access_token FROM sessions
                   WHERE expires_at > NOW() AND access_token <> $1
                   ORDER BY RANDOM()
                   LIMIT $2"#,
                &[&exclude_token, &limit],
            )
            .await?;
        Ok(rows.iter().map(|r| r.get(0)).collect())
    }

    pub async fn is_premium(&self, user_urn: &str) -> Result<bool, PgError> {
        let client = self.pool.get().await?;
        let now = chrono::Utc::now().timestamp();
        for key in subscription_lookup_keys(user_urn) {
            let row = client
                .query_opt(
                    r#"SELECT 1 FROM subscriptions WHERE user_urn = $1 AND exp_date > $2"#,
                    &[&key, &now],
                )
                .await?;
            if row.is_some() {
                return Ok(true);
            }
        }
        Ok(false)
    }
}

fn row_to_cdn_track(row: &tokio_postgres::Row) -> CdnTrackRecord {
    CdnTrackRecord {
        id: row.get::<_, Uuid>(0).to_string(),
        track_urn: row.get(1),
        status: row.get(2),
    }
}

fn subscription_lookup_keys(user_ref: &str) -> Vec<String> {
    let mut keys = Vec::new();
    let mut push = |k: &str| {
        let k = k.trim();
        if k.is_empty() || keys.iter().any(|x| x == k) {
            return;
        }
        keys.push(k.to_string());
    };

    push(user_ref);

    for prefix in ["soundcloud:users:", "soundcloud:people:"] {
        if let Some(id) = user_ref.strip_prefix(prefix) {
            push(id);
        }
    }

    if user_ref.chars().all(|c| c.is_ascii_digit()) {
        push(&format!("soundcloud:users:{user_ref}"));
    }

    keys
}
