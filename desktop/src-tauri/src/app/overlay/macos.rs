use objc2::rc::Retained;
use objc2_app_kit::{NSWindow, NSWindowCollectionBehavior, NSWindowLevel};
use tauri::WebviewWindow;

const CG_SCREEN_SAVER_WINDOW_LEVEL: i32 = 1000;

pub fn float_above_everything(window: &WebviewWindow) {
    let Some(native) = native_window(window) else {
        return;
    };

    native.setLevel(CG_SCREEN_SAVER_WINDOW_LEVEL as NSWindowLevel);
    native.setHidesOnDeactivate(false);
    native.setCollectionBehavior(
        NSWindowCollectionBehavior::CanJoinAllSpaces
            | NSWindowCollectionBehavior::FullScreenAuxiliary
            | NSWindowCollectionBehavior::Stationary
            | NSWindowCollectionBehavior::IgnoresCycle,
    );
}

fn native_window(window: &WebviewWindow) -> Option<Retained<NSWindow>> {
    let handle = window
        .ns_window()
        .inspect_err(|error| tracing::warn!("could not reach the overlay window: {error}"))
        .ok()?;

    let pointer = handle.cast::<NSWindow>();

    unsafe { Retained::retain(pointer) }
}
