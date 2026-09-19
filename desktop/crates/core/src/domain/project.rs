use serde::{Deserialize, Serialize};

pub type ProjectId = String;

/// A group of meetings the user made by hand: every stage of one interview, or
/// every call with one client. The backend counts the meetings inside.
#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct Project {
    pub id: ProjectId,
    pub name: String,
    pub meeting_count: u32,
    pub created_at: String,
    pub updated_at: String,
}
