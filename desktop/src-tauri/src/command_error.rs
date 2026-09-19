use meet_copilot_core::Error;
use serde::Serialize;

use crate::events::{BackendFailureLabel, ErrorKind};

#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct CommandError {
    pub kind: ErrorKind,
    pub failure: Option<BackendFailureLabel>,
    pub message: String,
}

impl CommandError {
    pub fn browser(message: String) -> Self {
        Self {
            kind: ErrorKind::Permission,
            failure: None,
            message: format!("Could not open the browser: {message}"),
        }
    }
}

impl From<CommandError> for crate::events::AppErrorEvent {
    fn from(error: CommandError) -> Self {
        Self {
            kind: error.kind,
            failure: error.failure,
            message: error.message,
        }
    }
}

impl From<Error> for CommandError {
    fn from(error: Error) -> Self {
        let kind = match error {
            Error::Audio(_) => ErrorKind::Audio,
            Error::Backend { .. } => ErrorKind::Backend,
            Error::Settings(_) => ErrorKind::Settings,
            Error::Permission(_) => ErrorKind::Permission,
            Error::Access(_) => ErrorKind::Access,
            Error::Screen(_) => ErrorKind::Screen,
            Error::Session(_) => ErrorKind::Session,
            Error::Cancelled => ErrorKind::Cancelled,
        };

        Self {
            kind,
            failure: error.backend_failure().map(Into::into),
            message: error.to_string(),
        }
    }
}
