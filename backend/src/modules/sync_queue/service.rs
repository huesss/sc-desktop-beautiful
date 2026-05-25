use std::sync::Arc;
use std::time::Duration;

use chrono::{DateTime, Utc};
use deadpool_redis::redis::AsyncCommands;
use deadpool_redis::Pool as RedisPool;
use serde::Serialize;
use serde_json::Value;
use sqlx::types::Uuid;
use sqlx::PgPool;
use tracing::warn;

use crate::error::AppResult;
use crate::modules::auth::AuthService;
use crate::sc::{self, ScClient};

use super::actions::{self, ActionCtx};

const BATCH_SIZE: i64 = 50;
const LOCK_TIMEOUT: Duration = Duration::from_secs(5 * 60);
const MAX_RETRIES: i32 = 5;
const BACKOFF_BAN_SEC: i64 = 30 * 60;
const BACKOFF_RATE_LIMIT_SEC: i64 = 5 * 60;
const BACKOFF_CAP_SEC: i64 = 60 * 60;
const COUNTS_CACHE_TTL_SEC: usize = 5;

#[derive(Debug, Clone, Serialize, sqlx::FromRow)]
pub struct SyncQueueRow {
    pub id: Uuid,
    pub user_id: String,
    pub action_type: String,
    pub target_urn: String,
    pub payload: Option<Value>,
    pub locked_at: Option<DateTime<Utc>>,
    pub retry_count: i32,
    pub last_error: Option<String>,
    pub next_run_at: DateTime<Utc>,
    pub created_at: DateTime<Utc>,
}

#[derive(Debug, Serialize)]
pub struct FlushStats {
    pub synced: usize,
    pub failed: usize,
}

pub struct SyncQueueService {
    pg: PgPool,
    sc: ScClient,
    auth: Arc<AuthService>,
    redis: RedisPool,
}

impl SyncQueueService {
    pub fn new(pg: PgPool, sc: ScClient, auth: Arc<AuthService>, redis: RedisPool) -> Arc<Self> {
        Arc::new(Self {
            pg,
            sc,
            auth,
            redis,
        })
    }

    pub async fn pending_counts_for_user(&self, sc_user_id: &str) -> AppResult<(i64, i64)> {
        if sc_user_id.is_empty() {
            return Ok((0, 0));
        }
        let key = format!("sync_queue:counts:{sc_user_id}");

        if let Ok(mut conn) = self.redis.get().await {
            let raw: Option<String> = conn.get(&key).await.ok().flatten();
            if let Some(s) = raw {
                if let Some((p, f)) = parse_counts(&s) {
                    return Ok((p, f));
                }
            }
        }

        let (pending, failed): (i64, i64) = sqlx::query_as(
            "SELECT \
                 COUNT(*) FILTER (WHERE retry_count = 0)::bigint, \
                 COUNT(*) FILTER (WHERE retry_count > 0)::bigint \
             FROM sync_queue WHERE user_id = $1",
        )
        .bind(sc_user_id)
        .fetch_one(&self.pg)
        .await?;

        if let Ok(mut conn) = self.redis.get().await {
            let payload = format!("{pending}:{failed}");
            let _: Result<(), _> = conn
                .set_ex(&key, payload, COUNTS_CACHE_TTL_SEC as u64)
                .await;
        }
        Ok((pending, failed))
    }

    pub async fn enqueue(
        &self,
        user_id: &str,
        action_type: &str,
        target_urn: &str,
        payload: Option<&Value>,
    ) -> AppResult<()> {
        if let Some(inv) = actions::inverse(action_type) {
            let cancelled = sqlx::query(
                "DELETE FROM sync_queue \
                 WHERE user_id = $1 AND action_type = $2 AND target_urn = $3 AND locked_at IS NULL",
            )
            .bind(user_id)
            .bind(inv)
            .bind(target_urn)
            .execute(&self.pg)
            .await?;
            if cancelled.rows_affected() > 0 {
                return Ok(());
            }
        }

        sqlx::query(
            "INSERT INTO sync_queue (user_id, action_type, target_urn, payload) \
             VALUES ($1, $2, $3, $4) \
             ON CONFLICT (user_id, action_type, target_urn) DO UPDATE SET \
                 payload = COALESCE(EXCLUDED.payload, sync_queue.payload), \
                 locked_at = NULL, \
                 retry_count = 0, \
                 last_error = NULL, \
                 next_run_at = now()",
        )
        .bind(user_id)
        .bind(action_type)
        .bind(target_urn)
        .bind(payload)
        .execute(&self.pg)
        .await?;
        Ok(())
    }

    pub async fn flush(&self) -> AppResult<FlushStats> {
        let claimed = self.claim_batch(BATCH_SIZE).await?;
        let mut synced = 0usize;
        let mut failed = 0usize;
        for row in claimed {
            match self.execute_one(&row).await {
                Ok(()) => {
                    sqlx::query("DELETE FROM sync_queue WHERE id = $1")
                        .bind(row.id)
                        .execute(&self.pg)
                        .await?;
                    synced += 1;
                }
                Err(err) => {
                    self.record_failure(&row, &err).await?;
                    failed += 1;
                }
            }
        }
        Ok(FlushStats { synced, failed })
    }

    async fn claim_batch(&self, limit: i64) -> AppResult<Vec<SyncQueueRow>> {
        let lock_timeout = Utc::now() - chrono::Duration::from_std(LOCK_TIMEOUT).unwrap();
        let rows: Vec<SyncQueueRow> = sqlx::query_as(
            "UPDATE sync_queue SET locked_at = now() \
             WHERE id IN ( \
                 SELECT id FROM sync_queue \
                 WHERE (locked_at IS NULL OR locked_at < $1) \
                   AND next_run_at <= now() \
                 ORDER BY next_run_at ASC, created_at ASC \
                 FOR UPDATE SKIP LOCKED \
                 LIMIT $2 \
             ) RETURNING *",
        )
        .bind(lock_timeout)
        .bind(limit)
        .fetch_all(&self.pg)
        .await?;
        Ok(rows)
    }

    async fn execute_one(&self, row: &SyncQueueRow) -> AppResult<()> {
        let token = self
            .auth
            .get_valid_access_token_for_user(&row.user_id)
            .await?;
        let ctx = ActionCtx {
            sc: &self.sc,
            pg: &self.pg,
            token: &token,
            user_id: &row.user_id,
            target_urn: &row.target_urn,
            payload: row.payload.as_ref(),
        };
        actions::dispatch(&ctx, &row.action_type).await
    }

    async fn record_failure(
        &self,
        row: &SyncQueueRow,
        err: &crate::error::AppError,
    ) -> AppResult<()> {
        let mut msg = err.to_string();
        msg.truncate(500);

        let backoff_sec = if sc::is_ban_error(err) {
            BACKOFF_BAN_SEC
        } else if sc::is_rate_limited(err) {
            BACKOFF_RATE_LIMIT_SEC
        } else {

            let next = row.retry_count + 1;
            if next >= MAX_RETRIES {
                sqlx::query("DELETE FROM sync_queue WHERE id = $1")
                    .bind(row.id)
                    .execute(&self.pg)
                    .await?;
                warn!(
                    action = %row.action_type,
                    target = %row.target_urn,
                    user = %row.user_id,
                    retries = next,
                    error = %msg,
                    "sync_queue action gave up after MAX_RETRIES"
                );
                return Ok(());
            }
            let secs = (60i64.saturating_mul(1 << next)).min(BACKOFF_CAP_SEC);
            sqlx::query(
                "UPDATE sync_queue SET \
                    locked_at = NULL, \
                    retry_count = retry_count + 1, \
                    last_error = $1, \
                    next_run_at = now() + ($2 || ' seconds')::interval \
                 WHERE id = $3",
            )
            .bind(&msg)
            .bind(secs)
            .bind(row.id)
            .execute(&self.pg)
            .await?;
            warn!(
                action = %row.action_type,
                target = %row.target_urn,
                retry = next,
                error = %msg,
                "sync_queue action failed, will retry"
            );
            return Ok(());
        };

        sqlx::query(
            "UPDATE sync_queue SET \
                locked_at = NULL, \
                last_error = $1, \
                next_run_at = now() + ($2 || ' seconds')::interval \
             WHERE id = $3",
        )
        .bind(&msg)
        .bind(backoff_sec)
        .bind(row.id)
        .execute(&self.pg)
        .await?;
        warn!(
            action = %row.action_type,
            target = %row.target_urn,
            backoff_sec,
            error = %msg,
            "sync_queue action blocked by SC (ban/rate-limit), backoff"
        );
        Ok(())
    }
}

fn parse_counts(s: &str) -> Option<(i64, i64)> {
    let (a, b) = s.split_once(':')?;
    Some((a.parse().ok()?, b.parse().ok()?))
}
