use serde::{Deserialize, Serialize};

use super::{language::Language, profile::MeetingProfile};

#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct UserSettings {
    pub style: Option<String>,
    pub default_language: Language,
    pub default_profile: MeetingProfile,
}

#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct Profile {
    pub id: String,
    pub email: String,
    pub name: String,
}
