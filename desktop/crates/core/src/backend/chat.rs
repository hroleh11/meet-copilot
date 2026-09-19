use std::pin::Pin;

use futures_core::Stream;
use serde::{Deserialize, Serialize};

use crate::error::Result;

pub type ChatId = String;

/// One conversation about a finished meeting. The backend keeps it, so the list
/// beside the meeting is the same on the next open. A chat with no question yet
/// has no title.
#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ChatSession {
    pub id: ChatId,
    pub title: Option<String>,
    pub message_count: u32,
    pub updated_at: String,
}

#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ChatMessage {
    pub id: String,
    pub question: String,
    pub answer: String,
    pub created_at: String,
}

#[derive(Debug, Clone, PartialEq, Eq)]
pub enum ChatDelta {
    Text(String),
    Done { message_id: String },
}

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ChatDonePayload {
    pub message_id: String,
}

pub type ChatStream<'a> = Pin<Box<dyn Stream<Item = Result<ChatDelta>> + Send + 'a>>;
