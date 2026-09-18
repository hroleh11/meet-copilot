use serde::{Deserialize, Serialize};

pub const DEFAULT_BACKEND_URL: &str = "http://localhost:5070/api/v1";

#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct Hotkeys {
    pub reply: String,
    pub alternative: String,
    pub hide: String,
}

impl Default for Hotkeys {
    fn default() -> Self {
        Self {
            reply: "CommandOrControl+Shift+Space".to_owned(),
            alternative: "CommandOrControl+Shift+A".to_owned(),
            hide: "CommandOrControl+Shift+H".to_owned(),
        }
    }
}

#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase", default)]
pub struct LocalSettings {
    pub backend_url: String,
    pub input_device: Option<String>,
    pub hotkeys: Hotkeys,
    pub onboarded: bool,
}

impl Default for LocalSettings {
    fn default() -> Self {
        Self {
            backend_url: DEFAULT_BACKEND_URL.to_owned(),
            input_device: None,
            hotkeys: Hotkeys::default(),
            onboarded: false,
        }
    }
}
