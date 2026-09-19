use std::sync::atomic::{AtomicBool, Ordering};

use tauri::{AppHandle, Manager, Monitor, PhysicalPosition, WebviewWindow};

use crate::{app::Emitter, events::OverlayInteractionEvent};

pub const LABEL: &str = "overlay";

const TOP_MARGIN: f64 = 56.0;
const RIGHT_MARGIN: f64 = 64.0;

static PLACED: AtomicBool = AtomicBool::new(false);
static INTERACTIVE: AtomicBool = AtomicBool::new(false);

pub fn prepare(app: &AppHandle) {
    let Some(window) = window(app) else { return };

    if let Err(error) = window.set_content_protected(true) {
        tracing::warn!("could not hide the overlay from screen sharing: {error}");
    }

    if let Err(error) = window.set_visible_on_all_workspaces(true) {
        tracing::warn!("could not keep the overlay on every space: {error}");
    }

    pass_clicks_through(&window, true);
    show(app);
}

pub fn show(app: &AppHandle) {
    let Some(window) = window(app) else { return };

    if let Err(error) = window.show() {
        tracing::warn!("could not show the overlay: {error}");
    }

    if !PLACED.swap(true, Ordering::SeqCst) {
        place(app, &window);
    }

    #[cfg(target_os = "macos")]
    super::macos_window::float_above_everything(&window, super::macos_window::Key::Leaves);
}

pub fn hide(app: &AppHandle) {
    let Some(window) = window(app) else { return };

    if let Err(error) = window.hide() {
        tracing::warn!("could not hide the overlay: {error}");
    }
}

/// The overlay sits over the meeting, so by default the mouse goes straight to
/// whatever is underneath it. A hotkey hands the mouse back, and only then can
/// the window be dragged, resized or scrolled.
pub fn toggle_interaction(app: &AppHandle) {
    let Some(window) = window(app) else { return };

    let interactive = !INTERACTIVE.fetch_xor(true, Ordering::SeqCst);

    pass_clicks_through(&window, !interactive);
    Emitter::new(app.clone()).overlay_interaction(OverlayInteractionEvent { interactive });
}

fn pass_clicks_through(window: &WebviewWindow, through: bool) {
    if let Err(error) = window.set_ignore_cursor_events(through) {
        tracing::warn!("could not change how the overlay answers the mouse: {error}");
    }
}

pub fn toggle(app: &AppHandle) {
    let Some(window) = window(app) else { return };

    match window.is_visible() {
        Ok(true) => hide(app),
        Ok(false) => show(app),
        Err(error) => tracing::warn!("could not read the overlay state: {error}"),
    }
}

fn window(app: &AppHandle) -> Option<WebviewWindow> {
    let window = app.get_webview_window(LABEL);

    if window.is_none() {
        tracing::warn!("the overlay window is missing");
    }

    window
}

/// The overlay opens on the display the user is working on, not on the one the
/// main window happens to sit on, and only the first time: after that the
/// position is whatever the user dragged it to.
fn place(app: &AppHandle, window: &WebviewWindow) {
    let Some(monitor) = active_monitor(app, window) else {
        return;
    };

    let Ok(size) = window.outer_size() else {
        return;
    };

    let screen = monitor.size();
    let scale = monitor.scale_factor();
    let position = PhysicalPosition::new(
        monitor.position().x
            + (screen.width as f64 - size.width as f64 - RIGHT_MARGIN * scale) as i32,
        monitor.position().y + (TOP_MARGIN * scale) as i32,
    );

    if let Err(error) = window.set_position(position) {
        tracing::warn!("could not place the overlay: {error}");
    }
}

fn active_monitor(app: &AppHandle, window: &WebviewWindow) -> Option<Monitor> {
    let cursor = app
        .cursor_position()
        .inspect_err(|error| tracing::warn!("could not read the cursor position: {error}"))
        .ok();

    let under_cursor = cursor
        .and_then(|point| window.monitor_from_point(point.x, point.y).ok())
        .flatten();

    let monitor = under_cursor.or_else(|| window.primary_monitor().ok().flatten());

    if monitor.is_none() {
        tracing::warn!("no monitor to place the overlay on");
    }

    monitor
}
