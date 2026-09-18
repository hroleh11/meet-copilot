use serde::{Deserialize, Serialize};

use super::speaker::Speaker;

#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct TranscriptSegment {
    pub id: String,
    pub speaker: Speaker,
    pub text: String,
    pub start_ms: u64,
    pub duration_ms: u64,
}
