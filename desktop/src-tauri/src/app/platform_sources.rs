use meet_copilot_core::{
    audio::{AudioSource, MicrophoneSource},
    session::AudioSources,
};

use super::microphone_choice;

pub struct PlatformSources;

impl AudioSources for PlatformSources {
    fn microphone(&self, device_id: Option<String>) -> Box<dyn AudioSource> {
        Box::new(MicrophoneSource::new(microphone_choice::resolve(device_id)))
    }

    #[cfg(target_os = "macos")]
    fn system_audio(&self) -> Option<Box<dyn AudioSource>> {
        Some(Box::new(
            meet_copilot_platform_macos::SystemAudioSource::new(),
        ))
    }

    #[cfg(not(target_os = "macos"))]
    fn system_audio(&self) -> Option<Box<dyn AudioSource>> {
        None
    }
}
