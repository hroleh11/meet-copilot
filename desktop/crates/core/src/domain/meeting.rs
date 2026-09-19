use serde::{Deserialize, Serialize};

use super::{
    generation::{Generation, Usage},
    language::Language,
    profile::MeetingProfile,
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
    pub usage: Usage,
}
