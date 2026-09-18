use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Copy, Default, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "snake_case")]
pub enum MeetingProfile {
    #[default]
    Daily,
    InterviewCandidate,
    ClientCall,
}
