use crate::domain::{GenerationMode, TokenUsage};

#[derive(Debug, Clone, PartialEq, Eq)]
pub enum GenerationEvent {
    Started {
        mode: GenerationMode,
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
