pub mod audio_devices;
pub mod capture_kit;
pub mod permissions;
pub mod screen_capture;
pub mod system_audio;

pub use meet_copilot_core::{Error, Result};
pub use screen_capture::RegionCapture;
pub use system_audio::SystemAudioSource;
