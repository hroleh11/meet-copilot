#[cfg(target_os = "macos")]
mod macos;

use tauri::{AppHandle, Manager, PhysicalPosition, WebviewWindow};

pub const LABEL: &str = "overlay";

const TOP_MARGIN: f64 = 56.0;
const RIGHT_MARGIN: f64 = 64.0;

pub fn prepare(app: &AppHandle) {
    let Some(window) = window(app) else { return };

    if let Err(error) = window.set_content_protected(true) {
        tracing::warn!("could not hide the overlay from screen sharing: {error}");
    }

    if let Err(error) = window.set_visible_on_all_workspaces(true) {
        tracing::warn!("could not keep the overlay on every space: {error}");
    }

    #[cfg(target_os = "macos")]
    macos::float_above_everything(&window);
}

pub fn show(app: &AppHandle) {
    let Some(window) = window(app) else { return };

    place(&window);

    if let Err(error) = window.show() {
        tracing::warn!("could not show the overlay: {error}");
    }
}

pub fn hide(app: &AppHandle) {
    let Some(window) = window(app) else { return };

    if let Err(error) = window.hide() {
        tracing::warn!("could not hide the overlay: {error}");
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

fn place(window: &WebviewWindow) {
    let Ok(Some(monitor)) = window.primary_monitor() else {
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
