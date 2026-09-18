use tauri::{AppHandle, Manager, PhysicalPosition, WebviewWindow};

pub const LABEL: &str = "overlay";

const BOTTOM_MARGIN: f64 = 96.0;

pub fn prepare(app: &AppHandle) {
    let Some(window) = window(app) else { return };

    if let Err(error) = window.set_content_protected(true) {
        eprintln!("could not hide the overlay from screen sharing: {error}");
    }
}

pub fn show(app: &AppHandle) {
    let Some(window) = window(app) else { return };

    place(&window);

    if let Err(error) = window.show() {
        eprintln!("could not show the overlay: {error}");
    }
}

pub fn hide(app: &AppHandle) {
    let Some(window) = window(app) else { return };

    if let Err(error) = window.hide() {
        eprintln!("could not hide the overlay: {error}");
    }
}

pub fn toggle(app: &AppHandle) {
    let Some(window) = window(app) else { return };

    match window.is_visible() {
        Ok(true) => hide(app),
        Ok(false) => show(app),
        Err(error) => eprintln!("could not read the overlay state: {error}"),
    }
}

fn window(app: &AppHandle) -> Option<WebviewWindow> {
    let window = app.get_webview_window(LABEL);

    if window.is_none() {
        eprintln!("the overlay window is missing");
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
        monitor.position().x + ((screen.width as f64 - size.width as f64) / 2.0) as i32,
        monitor.position().y
            + (screen.height as f64 - size.height as f64 - BOTTOM_MARGIN * scale) as i32,
    );

    if let Err(error) = window.set_position(position) {
        eprintln!("could not place the overlay: {error}");
    }
}
