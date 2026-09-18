use std::pin::Pin;

use futures_core::Stream;
use serde::Deserialize;

use crate::{domain::Usage, error::Result};

#[derive(Debug, Clone, PartialEq, Eq)]
pub enum Delta {
    Text(String),
    Done {
        generation_id: String,
        stop_reason: Option<String>,
        usage: Usage,
    },
}

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct DeltaPayload {
    pub text: String,
}

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct DonePayload {
    pub generation_id: String,
    pub stop_reason: Option<String>,
    pub usage: Usage,
}

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ErrorPayload {
    pub message: String,
}

pub type DeltaStream<'a> = Pin<Box<dyn Stream<Item = Result<Delta>> + Send + 'a>>;
