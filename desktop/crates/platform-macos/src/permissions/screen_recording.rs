use objc2_core_graphics::{CGPreflightScreenCaptureAccess, CGRequestScreenCaptureAccess};
use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub enum ScreenRecordingAccess {
    Granted,
    Denied,
}

impl ScreenRecordingAccess {
    pub fn is_granted(self) -> bool {
        matches!(self, Self::Granted)
    }
}

/// Reads the current Screen Recording permission without showing anything.
pub fn screen_recording_access() -> ScreenRecordingAccess {
    if CGPreflightScreenCaptureAccess() {
        ScreenRecordingAccess::Granted
    } else {
        ScreenRecordingAccess::Denied
    }
}

/// Asks macOS for Screen Recording. The system prompt appears only the first
/// time; afterwards this returns the standing answer and the user has to change
/// it in System Settings.
pub fn request_screen_recording_access() -> ScreenRecordingAccess {
    if CGRequestScreenCaptureAccess() {
        ScreenRecordingAccess::Granted
    } else {
        ScreenRecordingAccess::Denied
    }
}
