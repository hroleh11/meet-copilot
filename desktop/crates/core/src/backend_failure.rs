#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum BackendFailure {
    Unauthorized,
    NotFound,
    Conflict,
    Unavailable,
    Unexpected,
}

impl BackendFailure {
    pub fn from_http_status(status: u16) -> Self {
        match status {
            401 | 403 => Self::Unauthorized,
            404 => Self::NotFound,
            409 => Self::Conflict,
            502..=504 => Self::Unavailable,
            _ => Self::Unexpected,
        }
    }

    pub fn from_close_code(code: u16) -> Self {
        match code {
            4401 => Self::Unauthorized,
            4404 => Self::NotFound,
            _ => Self::Unavailable,
        }
    }

    pub fn default_message(self) -> &'static str {
        match self {
            Self::Unauthorized => "Sign in again to continue",
            Self::NotFound => "This meeting is no longer available",
            Self::Conflict => "This meeting is already finished",
            Self::Unavailable => "The service is unreachable right now",
            Self::Unexpected => "Something went wrong on the server",
        }
    }

    pub fn is_retryable(self) -> bool {
        matches!(self, Self::Unavailable)
    }
}
