use serde::{Deserialize, Serialize};

use super::{meeting::MeetingId, project::ProjectId};

pub type ResourceId = String;

/// Which of the three levels a material belongs to. A meeting material uploaded
/// before the meeting exists carries no id yet: the meeting claims it at start.
#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase", tag = "kind", content = "id")]
pub enum ResourceScope {
    User,
    Project(ProjectId),
    Meeting(Option<MeetingId>),
}

#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "snake_case")]
pub enum ResourceKind {
    Pdf,
    Markdown,
    Text,
}

#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "snake_case")]
pub enum ResourceStatus {
    Pending,
    Ready,
    Failed,
}

/// Why a material could not be taken in. It is a reason, not a sentence: the
/// desktop is the one that speaks Ukrainian.
#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "snake_case")]
pub enum ResourceFailure {
    Unreadable,
    NoTextLayer,
    Storage,
}

#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct Resource {
    pub id: ResourceId,
    pub project_id: Option<ProjectId>,
    pub meeting_id: Option<MeetingId>,
    pub kind: ResourceKind,
    pub name: String,
    pub byte_size: u64,
    pub status: ResourceStatus,
    pub failure: Option<ResourceFailure>,
    pub created_at: String,
}

/// What was read out of a material. `digest` is the compressed version the model
/// is given when the whole text did not fit the level's budget, so showing both
/// is showing what the copilot actually sees.
#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ResourceContent {
    pub name: String,
    pub text: Option<String>,
    pub digest: Option<String>,
    pub chars: u32,
}

#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ResourceLimits {
    pub max_bytes: u64,
    pub max_text_chars: u32,
}

#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct NewResourceFile {
    pub name: String,
    pub mime_type: String,
    pub bytes: Vec<u8>,
}

const PDF: &str = "application/pdf";
const MARKDOWN: &str = "text/markdown";
const PLAIN: &str = "text/plain";

/// The backend accepts these three and nothing else, so a file it would refuse is
/// named here instead of after a round trip.
pub fn resource_mime_type(name: &str) -> Option<&'static str> {
    match name.rsplit('.').next()?.to_ascii_lowercase().as_str() {
        "pdf" => Some(PDF),
        "md" | "markdown" => Some(MARKDOWN),
        "txt" | "text" => Some(PLAIN),
        _ => None,
    }
}
