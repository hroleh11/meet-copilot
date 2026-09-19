mod content;
mod thread_safe;

pub use content::{shareable_content, wait_for};
pub use thread_safe::ThreadSafe;

/// Whether ScreenCaptureKit will serve this process at all. The answer comes
/// from ScreenCaptureKit itself, because the permission flag macOS exposes is
/// wrong for processes it does serve.
pub fn capture_allowed() -> bool {
    match shareable_content() {
        Ok(_) => true,
        Err(error) => {
            tracing::info!("screen capture is not available: {error}");
            false
        }
    }
}
