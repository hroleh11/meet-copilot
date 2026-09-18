use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Copy, PartialEq, Eq, Hash, Serialize, Deserialize)]
#[serde(rename_all = "snake_case")]
pub enum Speaker {
    Me,
    Other,
}

impl Speaker {
    pub fn as_query_value(self) -> &'static str {
        match self {
            Self::Me => "me",
            Self::Other => "other",
        }
    }
}
