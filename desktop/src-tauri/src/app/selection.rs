use std::sync::{
    atomic::{AtomicBool, Ordering},
    Mutex,
};

use cueline_core::{
    error::{Error, Result},
    screenshot::CaptureRect,
};
use serde::Deserialize;
use tauri::{
    AppHandle, LogicalPosition, LogicalSize, Manager, WebviewUrl, WebviewWindow,
    WebviewWindowBuilder,
};
use tauri_plugin_global_shortcut::{GlobalShortcutExt, ShortcutState};
use tokio::sync::oneshot;

pub const LABEL: &str = "selection";

const CANCEL_KEY: &str = "Escape";

#[derive(Debug, Clone, Copy, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct SelectionRect {
    pub x: f64,
    pub y: f64,
    pub width: f64,
    pub height: f64,
}

struct Pending {
    answer: oneshot::Sender<Option<CaptureRect>>,
    origin: LogicalPosition<f64>,
}

static PENDING: Mutex<Option<Pending>> = Mutex::new(None);
static OPEN: AtomicBool = AtomicBool::new(false);

/// A second press while the screen is already dimmed is the user wondering
/// whether the first one landed, not a request for another selection.
pub async fn pick_region(app: &AppHandle) -> Result<Option<CaptureRect>> {
    if OPEN.swap(true, Ordering::SeqCst) {
        tracing::info!("a region is already being selected");

        return Ok(None);
    }

    let (answer, picked) = oneshot::channel();
    let opened = open(app, answer).await;

    if opened.is_err() {
        finish(app);
    }

    opened?;

    watch_for_escape(app);

    let rect = picked.await.unwrap_or(None);

    finish(app);

    Ok(rect)
}

fn finish(app: &AppHandle) {
    PENDING.lock().ok().and_then(|mut slot| slot.take());

    if let Err(error) = app.global_shortcut().unregister(CANCEL_KEY) {
        tracing::warn!("could not release the cancel key: {error}");
    }

    close(app);
    OPEN.store(false, Ordering::SeqCst);
}

/// The window never becomes key, so Escape has to be caught globally: a window
/// that takes the keyboard also activates the app, and macOS then drags the user
/// to the space the app lives on.
fn watch_for_escape(app: &AppHandle) {
    let registered = app
        .global_shortcut()
        .on_shortcut(CANCEL_KEY, |_, _, event| {
            if event.state == ShortcutState::Pressed {
                deliver(None);
            }
        });

    if let Err(error) = registered {
        tracing::warn!("could not listen for the cancel key: {error}");
    }
}

pub fn deliver(rect: Option<SelectionRect>) {
    let Some(pending) = PENDING.lock().ok().and_then(|mut slot| slot.take()) else {
        return;
    };

    let picked = rect.map(|rect| CaptureRect {
        x: pending.origin.x + rect.x,
        y: pending.origin.y + rect.y,
        width: rect.width,
        height: rect.height,
    });

    let _ = pending.answer.send(picked);
}

/// AppKit builds windows on the main thread only, and the hotkey that asks for a
/// screenshot runs on a tokio worker.
async fn open(app: &AppHandle, answer: oneshot::Sender<Option<CaptureRect>>) -> Result<()> {
    let (built, wait) = oneshot::channel();
    let handle = app.clone();

    handle
        .clone()
        .run_on_main_thread(move || {
            let _ = built.send(cover_every_display(&handle));
        })
        .map_err(|error| Error::Screen(format!("Could not reach the main thread: {error}")))?;

    let origin = wait
        .await
        .map_err(|_| Error::Screen("The selection never opened".to_owned()))??;

    if let Ok(mut slot) = PENDING.lock() {
        *slot = Some(Pending { answer, origin });
    }

    Ok(())
}

/// One window over every display, not just the one under the cursor: the screen
/// being asked about is usually not the screen the app sits on.
fn cover_every_display(app: &AppHandle) -> Result<LogicalPosition<f64>> {
    let (origin, size) = desktop(app)?;

    let window = match app.get_webview_window(LABEL) {
        Some(window) => place(window, origin, size)?,
        None => build(app, origin, size)?,
    };

    hide_from_the_shot(&window);

    #[cfg(target_os = "macos")]
    super::macos_window::float_above_everything(&window, super::macos_window::Key::Takes);

    Ok(origin)
}

fn desktop(app: &AppHandle) -> Result<(LogicalPosition<f64>, LogicalSize<f64>)> {
    let monitors = app
        .available_monitors()
        .map_err(|error| Error::Screen(format!("Could not read the displays: {error}")))?;

    let mut corners: Option<(f64, f64, f64, f64)> = None;

    for monitor in monitors {
        let scale = monitor.scale_factor();
        let origin: LogicalPosition<f64> = monitor.position().to_logical(scale);
        let size: LogicalSize<f64> = monitor.size().to_logical(scale);
        let (right, bottom) = (origin.x + size.width, origin.y + size.height);

        corners = Some(match corners {
            None => (origin.x, origin.y, right, bottom),
            Some(seen) => (
                seen.0.min(origin.x),
                seen.1.min(origin.y),
                seen.2.max(right),
                seen.3.max(bottom),
            ),
        });
    }

    let (left, top, right, bottom) =
        corners.ok_or_else(|| Error::Screen("No display to select a region on".to_owned()))?;

    Ok((
        LogicalPosition::new(left, top),
        LogicalSize::new(right - left, bottom - top),
    ))
}

/// Closing a window is a message to the event loop, so one that was just asked
/// to close still owns its label when the next press arrives.
fn place(
    window: WebviewWindow,
    origin: LogicalPosition<f64>,
    size: LogicalSize<f64>,
) -> Result<WebviewWindow> {
    window
        .set_position(origin)
        .and_then(|()| window.set_size(size))
        .and_then(|()| window.show())
        .map_err(|error| Error::Screen(format!("Could not move the selection: {error}")))?;

    Ok(window)
}

fn build(
    app: &AppHandle,
    origin: LogicalPosition<f64>,
    size: LogicalSize<f64>,
) -> Result<WebviewWindow> {
    WebviewWindowBuilder::new(app, LABEL, WebviewUrl::App("selection.html".into()))
        .position(origin.x, origin.y)
        .inner_size(size.width, size.height)
        .decorations(false)
        .transparent(true)
        .always_on_top(true)
        .skip_taskbar(true)
        .shadow(false)
        .resizable(false)
        .build()
        .map_err(|error| Error::Screen(format!("Could not open the selection: {error}")))
}

fn hide_from_the_shot(window: &WebviewWindow) {
    if let Err(error) = window.set_content_protected(true) {
        tracing::warn!("could not keep the selection out of the screenshot: {error}");
    }
}

fn close(app: &AppHandle) {
    if let Some(window) = app.get_webview_window(LABEL) {
        if let Err(error) = window.close() {
            tracing::warn!("could not close the selection: {error}");
        }
    }
}
