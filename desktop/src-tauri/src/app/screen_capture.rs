use cueline_core::{
    error::{Error, Result},
    screenshot::{CaptureRect, Screenshot},
};
use tauri::AppHandle;

use super::selection;

pub async fn capture_region(app: &AppHandle) -> Result<Option<Screenshot>> {
    allowed().await?;

    let Some(rect) = selection::pick_region(app).await? else {
        return Ok(None);
    };

    capture(rect).await.map(Some)
}

/// The permission is asked for before the selection opens, so nobody drags a
/// rectangle only to be told that macOS was never going to hand it over.
#[cfg(target_os = "macos")]
async fn allowed() -> Result<()> {
    let allowed = tokio::task::spawn_blocking(cueline_platform_macos::capture_kit::capture_allowed)
        .await
        .unwrap_or(false);

    if allowed {
        return Ok(());
    }

    cueline_platform_macos::permissions::request_screen_recording_access();

    Err(Error::Screen(
        "Screen Recording is not allowed for Cueline".to_owned(),
    ))
}

#[cfg(not(target_os = "macos"))]
async fn allowed() -> Result<()> {
    Err(Error::Screen(
        "Screenshots are only available on macOS for now".to_owned(),
    ))
}

#[cfg(target_os = "macos")]
async fn capture(rect: CaptureRect) -> Result<Screenshot> {
    use cueline_core::screenshot::ScreenCapture;

    cueline_platform_macos::RegionCapture.capture(rect).await
}

#[cfg(not(target_os = "macos"))]
async fn capture(_rect: CaptureRect) -> Result<Screenshot> {
    Err(Error::Screen(
        "Screenshots are only available on macOS for now".to_owned(),
    ))
}
