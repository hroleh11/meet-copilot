use meet_copilot_core::{
    domain::{GenerationMode, Profile, SessionState, Speaker, TokenUsage},
    BackendFailure,
};
use serde::Serialize;

pub const AUTH_STATE: &str = "auth:state";
pub const SESSION_STATE: &str = "session:state";
pub const AUDIO_LEVEL: &str = "audio:level";
pub const TRANSCRIPT_SEGMENT: &str = "transcript:segment";
pub const GENERATION_STARTED: &str = "generation:started";
pub const GENERATION_DELTA: &str = "generation:delta";
pub const GENERATION_FINISHED: &str = "generation:finished";
pub const GENERATION_FAILED: &str = "generation:failed";
pub const APP_ERROR: &str = "app:error";

#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct AuthStateEvent {
    pub signed_in: bool,
    pub profile: Option<Profile>,
}

#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct SessionStateEvent {
    pub state: SessionState,
    pub meeting_id: Option<String>,
    pub message: Option<String>,
}

#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct AudioLevelEvent {
    pub speaker: Speaker,
    pub level: f32,
}

#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct TranscriptSegmentEvent {
    pub id: String,
    pub speaker: Speaker,
    pub text: String,
    pub is_final: bool,
}

#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct GenerationStartedEvent {
    pub mode: GenerationMode,
}

#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct GenerationDeltaEvent {
    pub text: String,
}

#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct GenerationFinishedEvent {
    pub generation_id: String,
    pub usage: TokenUsage,
}

#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct GenerationFailedEvent {
    pub message: String,
}

#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize)]
#[serde(rename_all = "camelCase")]
pub enum ErrorKind {
    Audio,
    Backend,
    Settings,
    Permission,
    Access,
    Cancelled,
}

#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct AppErrorEvent {
    pub kind: ErrorKind,
    pub failure: Option<BackendFailureLabel>,
    pub message: String,
}

#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize)]
#[serde(rename_all = "camelCase")]
pub enum BackendFailureLabel {
    Unauthorized,
    NotFound,
    Conflict,
    Unavailable,
    Unexpected,
}

impl From<BackendFailure> for BackendFailureLabel {
    fn from(failure: BackendFailure) -> Self {
        match failure {
            BackendFailure::Unauthorized => Self::Unauthorized,
            BackendFailure::NotFound => Self::NotFound,
            BackendFailure::Conflict => Self::Conflict,
            BackendFailure::Unavailable => Self::Unavailable,
            BackendFailure::Unexpected => Self::Unexpected,
        }
    }
}
