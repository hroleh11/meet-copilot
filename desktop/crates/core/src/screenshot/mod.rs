mod capture;
mod shrink;

pub use capture::{CaptureRect, RawFrame, ScreenCapture, Screenshot};
pub use shrink::{shrink, JPEG_MIME, MAX_EDGE};
