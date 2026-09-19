mod content;
mod sample_buffer;
mod source;
mod stream_output;
mod thread_safe;

use content::shareable_content;

pub use source::SystemAudioSource;

/// Whether the meeting audio can be captured at all. The answer comes from
/// ScreenCaptureKit itself, because the permission flag macOS exposes is wrong
/// for processes it does serve.
pub fn system_audio_available() -> bool {
    match shareable_content() {
        Ok(_) => true,
        Err(error) => {
            tracing::info!("the meeting audio is not available: {error}");
            false
        }
    }
}
