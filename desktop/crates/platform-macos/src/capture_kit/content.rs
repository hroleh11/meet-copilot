use std::{
    sync::mpsc::{sync_channel, SyncSender},
    time::Duration,
};

use block2::RcBlock;
use meet_copilot_core::error::{Error, Result};
use objc2::rc::Retained;
use objc2_foundation::NSError;
use objc2_screen_capture_kit::SCShareableContent;

use super::thread_safe::ThreadSafe;

const SETUP_TIMEOUT: Duration = Duration::from_secs(10);

/// Asking ScreenCaptureKit what it can share is both the first step of a capture
/// and the only honest answer to whether the meeting audio is available at all:
/// `CGPreflightScreenCaptureAccess` says no for processes it happily serves.
pub fn shareable_content() -> Result<ThreadSafe<SCShareableContent>> {
    wait_for("list the displays", |done| {
        let handler = RcBlock::new(
            move |content: *mut SCShareableContent, error: *mut NSError| {
                let _ = done.send(describe(content, error));
            },
        );

        unsafe { SCShareableContent::getShareableContentWithCompletionHandler(&handler) };
    })?
}

pub fn wait_for<T: Send + 'static>(what: &str, begin: impl FnOnce(SyncSender<T>)) -> Result<T> {
    let (done, wait) = sync_channel(1);

    begin(done);

    wait.recv_timeout(SETUP_TIMEOUT)
        .map_err(|_| Error::Audio(format!("macOS did not answer in time when asked to {what}")))
}

fn describe(
    content: *mut SCShareableContent,
    error: *mut NSError,
) -> Result<ThreadSafe<SCShareableContent>> {
    if let Some(error) = unsafe { error.as_ref() } {
        return Err(Error::Permission(format!(
            "Could not read what is on screen: {error}"
        )));
    }

    unsafe { Retained::retain(content) }
        .map(ThreadSafe::new)
        .ok_or_else(|| Error::Audio("macOS returned no capturable content".to_owned()))
}
