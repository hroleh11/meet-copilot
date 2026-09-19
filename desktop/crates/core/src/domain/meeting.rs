use serde::{Deserialize, Serialize};

use super::{
    generation::{Generation, Usage},
    language::Language,
    profile::MeetingProfile,
    project::ProjectId,
    resource::{Resource, ResourceId},
    segment::TranscriptSegment,
};

pub type MeetingId = String;

#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "snake_case")]
pub enum MeetingStatus {
    Live,
    Finished,
}

#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct Meeting {
    pub id: MeetingId,
    pub project_id: Option<ProjectId>,
    pub profile: MeetingProfile,
    pub language: Language,
    pub title: Option<String>,
    pub status: MeetingStatus,
    pub started_at: String,
    pub ended_at: Option<String>,
}

#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct MeetingDetails {
    #[serde(flatten)]
    pub meeting: Meeting,
    pub overview: Option<String>,
    pub segments: Vec<TranscriptSegment>,
    pub generations: Vec<Generation>,
    pub resources: Vec<Resource>,
    pub usage: Usage,
}

/// What a meeting starts with. The project decides which project materials join
/// the context, and the ids are the materials uploaded for this call before it
/// existed; both are frozen into the meeting at creation.
#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct MeetingStart {
    pub profile: MeetingProfile,
    pub language: Language,
    pub project_id: Option<ProjectId>,
    pub resource_ids: Vec<ResourceId>,
}

/// Which meetings a list asks for: everything, only the ones left outside every
/// project, or the ones grouped into one.
#[derive(Debug, Clone, PartialEq, Eq, Default, Serialize, Deserialize)]
#[serde(rename_all = "camelCase", tag = "kind", content = "id")]
pub enum MeetingScope {
    #[default]
    All,
    Outside,
    Project(ProjectId),
}
