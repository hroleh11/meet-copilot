use async_trait::async_trait;
use serde::Deserialize;

use crate::{audio::AudioFrame, domain::Speaker, error::Result};

#[derive(Debug, Clone, PartialEq, Eq)]
pub enum SttEvent {
    Partial {
        speaker: Speaker,
        text: String,
    },
    Final {
        id: String,
        speaker: Speaker,
        text: String,
        start_ms: u64,
        duration_ms: u64,
    },
    Failed {
        message: String,
    },
}

#[derive(Debug, Deserialize)]
#[serde(tag = "type", rename_all = "camelCase")]
pub enum SttMessage {
    #[serde(rename_all = "camelCase")]
    Partial {
        speaker: Speaker,
        text: String,
    },
    #[serde(rename_all = "camelCase")]
    Final {
        id: String,
        speaker: Speaker,
        text: String,
        start_ms: u64,
        duration_ms: u64,
    },
    Error {
        message: String,
    },
}

impl From<SttMessage> for SttEvent {
    fn from(message: SttMessage) -> Self {
        match message {
            SttMessage::Partial { speaker, text } => Self::Partial { speaker, text },
            SttMessage::Final {
                id,
                speaker,
                text,
                start_ms,
                duration_ms,
            } => Self::Final {
                id,
                speaker,
                text,
                start_ms,
                duration_ms,
            },
            SttMessage::Error { message } => Self::Failed { message },
        }
    }
}

#[async_trait]
pub trait SttStream: Send {
    async fn send(&mut self, frame: &AudioFrame) -> Result<()>;
    async fn next(&mut self) -> Option<SttEvent>;
    async fn close(self: Box<Self>) -> Result<()>;
}
