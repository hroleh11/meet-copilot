use async_trait::async_trait;
use block2::RcBlock;
use cueline_core::{
    error::{Error, Result},
    screenshot::{shrink, CaptureRect, RawFrame, ScreenCapture, Screenshot},
};
use objc2::{rc::Retained, AnyThread};
use objc2_core_foundation::{CGPoint, CGRect, CGSize};
use objc2_core_graphics::{CGDisplayCopyDisplayMode, CGDisplayMode, CGImage};
use objc2_foundation::{NSArray, NSError};
use objc2_screen_capture_kit::{
    SCContentFilter, SCDisplay, SCScreenshotManager, SCStreamConfiguration,
};

use super::frame::to_raw_frame;
use crate::capture_kit::{shareable_content, wait_for, ThreadSafe};

pub struct RegionCapture;

#[async_trait]
impl ScreenCapture for RegionCapture {
    async fn capture(&self, rect: CaptureRect) -> Result<Screenshot> {
        let frame = tokio::task::spawn_blocking(move || grab(rect))
            .await
            .map_err(|error| Error::Screen(format!("The screenshot task died: {error}")))??;

        shrink(frame)
    }
}

fn grab(rect: CaptureRect) -> Result<RawFrame> {
    let content = shareable_content().map_err(as_screen_failure)?;
    let displays = unsafe { content.get().displays() };
    let display = holding(&displays, &rect)?;
    let filter = unsafe {
        SCContentFilter::initWithDisplay_excludingWindows(
            SCContentFilter::alloc(),
            &display,
            &NSArray::new(),
        )
    };

    let image = take(&filter, &configuration(&display, &rect)).map_err(as_screen_failure)?;

    to_raw_frame(image.get())
}

/// Displays can differ in how many pixels a point is worth, so the sharpness of
/// a shot comes from the display it was taken on, never from the window the
/// rectangle was drawn in.
fn pixels_per_point(display: &SCDisplay) -> f64 {
    let width = unsafe { display.frame() }.size.width;
    let mode = CGDisplayCopyDisplayMode(unsafe { display.displayID() });
    let pixels = mode
        .map(|mode| CGDisplayMode::pixel_width(Some(&mode)) as f64)
        .unwrap_or_default();

    if width <= 0.0 || pixels <= 0.0 {
        return 1.0;
    }

    pixels / width
}

/// ScreenCaptureKit is shared with the meeting audio, so whatever it says comes
/// back as a screen failure here. The permission is asked about before the
/// selection opens; blaming it again from here would hide the real reason.
fn as_screen_failure(error: Error) -> Error {
    Error::Screen(error.to_string())
}

fn holding(displays: &NSArray<SCDisplay>, rect: &CaptureRect) -> Result<Retained<SCDisplay>> {
    displays
        .iter()
        .find(|display| covers(unsafe { display.frame() }, rect))
        .or_else(|| displays.firstObject())
        .ok_or_else(|| Error::Screen("No display answered the screenshot".to_owned()))
}

fn covers(frame: CGRect, rect: &CaptureRect) -> bool {
    let middle = (rect.x + rect.width / 2.0, rect.y + rect.height / 2.0);

    middle.0 >= frame.origin.x
        && middle.0 < frame.origin.x + frame.size.width
        && middle.1 >= frame.origin.y
        && middle.1 < frame.origin.y + frame.size.height
}

fn configuration(display: &SCDisplay, rect: &CaptureRect) -> Retained<SCStreamConfiguration> {
    let frame = unsafe { display.frame() };
    let scale = pixels_per_point(display);
    let configuration = unsafe { SCStreamConfiguration::new() };

    tracing::info!(
        "screenshot of {}x{} at {},{} from the display at {},{} at {scale} pixels per point",
        rect.width,
        rect.height,
        rect.x,
        rect.y,
        frame.origin.x,
        frame.origin.y
    );

    unsafe {
        configuration.setSourceRect(CGRect {
            origin: CGPoint {
                x: rect.x - frame.origin.x,
                y: rect.y - frame.origin.y,
            },
            size: CGSize {
                width: rect.width,
                height: rect.height,
            },
        });
        configuration.setWidth((rect.width * scale).round().max(1.0) as usize);
        configuration.setHeight((rect.height * scale).round().max(1.0) as usize);
        configuration.setShowsCursor(false);
        configuration.setScalesToFit(false);
    }

    configuration
}

fn take(
    filter: &SCContentFilter,
    configuration: &SCStreamConfiguration,
) -> Result<ThreadSafe<CGImage>> {
    wait_for("take the screenshot", |done| {
        let handler = RcBlock::new(move |image: *mut CGImage, error: *mut NSError| {
            let _ = done.send(describe(image, error));
        });

        unsafe {
            SCScreenshotManager::captureImageWithFilter_configuration_completionHandler(
                filter,
                configuration,
                Some(&handler),
            );
        };
    })?
}

fn describe(image: *mut CGImage, error: *mut NSError) -> Result<ThreadSafe<CGImage>> {
    if let Some(error) = unsafe { error.as_ref() } {
        return Err(Error::Screen(format!("Could not read the screen: {error}")));
    }

    unsafe { Retained::retain(image) }
        .map(ThreadSafe::new)
        .ok_or_else(|| Error::Screen("macOS returned an empty screenshot".to_owned()))
}
