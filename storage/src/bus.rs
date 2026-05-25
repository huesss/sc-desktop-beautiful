use async_nats::jetstream::{self, Context};
use serde::Serialize;
use tracing::{debug, info, warn};

#[derive(Clone)]
pub struct BusClient {
    js: Option<Context>,
}

impl BusClient {
    pub async fn connect(url: &str) -> Self {
        if url.is_empty() {
            return Self { js: None };
        }

        let (host_url, user, pass) = split_creds(url);
        let mut opts = async_nats::ConnectOptions::new().retry_on_initial_connect();
        if let (Some(u), Some(p)) = (user, pass) {
            opts = opts.user_and_password(u, p);
        }
        match opts.connect(&host_url).await {
            Ok(client) => {
                info!("NATS connected → {host_url}");
                Self {
                    js: Some(jetstream::new(client)),
                }
            }
            Err(e) => {
                warn!("NATS connect {host_url} failed: {e}");
                Self { js: None }
            }
        }
    }

    pub fn enabled(&self) -> bool {
        self.js.is_some()
    }

    pub fn publish_track_uploaded(&self, sc_track_id: String, storage_url: String) {
        let Some(js) = self.js.clone() else {
            return;
        };
        tokio::spawn(async move {
            #[derive(Serialize)]
            struct Payload {
                sc_track_id: String,
                storage_url: String,
            }
            let body = match serde_json::to_vec(&Payload {
                sc_track_id,
                storage_url,
            }) {
                Ok(b) => b,
                Err(e) => {
                    warn!("[bus] encode storage.track_uploaded: {e}");
                    return;
                }
            };
            match js.publish("storage.track_uploaded", body.into()).await {
                Ok(ack) => match ack.await {
                    Ok(_) => debug!("[bus] storage.track_uploaded published"),
                    Err(e) => warn!("[bus] storage.track_uploaded ack failed: {e}"),
                },
                Err(e) => warn!("[bus] storage.track_uploaded publish failed: {e}"),
            }
        });
    }
}

fn split_creds(url: &str) -> (String, Option<String>, Option<String>) {
    let (scheme, rest) = url.split_once("://").unwrap_or(("nats", url));
    let Some((creds, host)) = rest.rsplit_once('@') else {
        return (url.to_string(), None, None);
    };
    let host_url = format!("{scheme}://{host}");
    match creds.split_once(':') {
        Some((u, p)) => (host_url, Some(u.to_string()), Some(p.to_string())),
        None => (host_url, Some(creds.to_string()), None),
    }
}

pub fn sc_track_id_from_filename(filename: &str) -> Option<String> {
    let last = filename.rsplit('_').next().unwrap_or(filename);
    if !last.is_empty() && last.bytes().all(|b| b.is_ascii_digit()) {
        Some(last.to_string())
    } else {
        None
    }
}
