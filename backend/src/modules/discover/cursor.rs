use base64::Engine;
use serde::{Deserialize, Serialize};
use uuid::Uuid;

use crate::error::{AppError, AppResult};

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ArtistCursor {

    pub p: f64,

    #[serde(default)]
    pub p2: f64,

    pub n: String,

    pub id: Uuid,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct AlbumCursor {

    pub p: f64,

    #[serde(default)]
    pub p2: f64,

    pub n: String,
    pub id: Uuid,
}

pub fn encode<T: Serialize>(c: &T) -> String {
    let json = serde_json::to_vec(c).expect("cursor serialization");
    base64::engine::general_purpose::URL_SAFE_NO_PAD.encode(json)
}

pub fn decode<T: for<'de> Deserialize<'de>>(s: &str) -> AppResult<T> {
    let bytes = base64::engine::general_purpose::URL_SAFE_NO_PAD
        .decode(s.as_bytes())
        .map_err(|_| AppError::bad_request("invalid cursor"))?;
    serde_json::from_slice(&bytes).map_err(|_| AppError::bad_request("invalid cursor"))
}
