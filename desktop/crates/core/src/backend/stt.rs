use async_trait::async_trait;
use serde::Deserialize;

use crate::{
    audio::AudioFrame,
    domain::{MeetingId, Speaker},
    error::Result,
};

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

/// The writing half of one speech lane. Kept apart from the reading half so a
/// lane can push audio and receive transcript at the same time.
#[async_trait]
pub trait SttSink: Send {
    async fn send(&mut self, frame: &AudioFrame) -> Result<()>;
    async fn close(&mut self) -> Result<()>;
}

/// The reading half of one speech lane. `None` means the lane ended.
#[async_trait]
pub trait SttEvents: Send {
    async fn next(&mut self) -> Option<SttEvent>;
}

pub type SttLane = (Box<dyn SttSink>, Box<dyn SttEvents>);

#[async_trait]
pub trait SttGateway: Send + Sync {
    async fn open(&self, meeting_id: &MeetingId, speaker: Speaker) -> Result<SttLane>;
}
