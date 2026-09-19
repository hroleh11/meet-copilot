use objc2_app_kit::NSWorkspace;
use objc2_foundation::{NSString, NSURL};

const MICROPHONE: &str =
    "x-apple.systempreferences:com.apple.preference.security?Privacy_Microphone";
const SCREEN_RECORDING: &str =
    "x-apple.systempreferences:com.apple.preference.security?Privacy_ScreenCapture";

/// macOS only ever asks for a permission once. After that the answer can be
/// changed in System Settings and nowhere else, so the app opens the exact pane
/// instead of describing where to click.
#[derive(Debug, Clone, Copy)]
pub enum PrivacyPane {
    Microphone,
    ScreenRecording,
}

pub fn open_privacy_settings(pane: PrivacyPane) -> bool {
    let address = match pane {
        PrivacyPane::Microphone => MICROPHONE,
        PrivacyPane::ScreenRecording => SCREEN_RECORDING,
    };

    let Some(url) = NSURL::URLWithString(&NSString::from_str(address)) else {
        return false;
    };

    NSWorkspace::sharedWorkspace().openURL(&url)
}
