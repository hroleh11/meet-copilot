use crate::domain::{GenerationMode, TokenUsage};

#[derive(Debug, Clone, PartialEq, Eq)]
pub enum GenerationEvent {
    Started {
        mode: GenerationMode,
        with_screenshot: bool,
    },
    Delta {
        text: String,
    },
    Finished {
        generation_id: String,
        usage: TokenUsage,
    },
    Failed {
        message: String,
    },
}
