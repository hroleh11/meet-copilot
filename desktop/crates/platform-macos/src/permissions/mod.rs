mod privacy_settings;
mod screen_recording;

pub use privacy_settings::{open_privacy_settings, PrivacyPane};
pub use screen_recording::{
    request_screen_recording_access, screen_recording_access, ScreenRecordingAccess,
};
