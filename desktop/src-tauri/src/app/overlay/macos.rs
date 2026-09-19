use objc2::rc::Retained;
use objc2::runtime::AnyObject;
use objc2::{ffi, ClassType};
use objc2_app_kit::{
    NSPanel, NSWindow, NSWindowCollectionBehavior, NSWindowLevel, NSWindowStyleMask,
};
use tauri::WebviewWindow;

const CG_SCREEN_SAVER_WINDOW_LEVEL: i32 = 1000;

pub fn float_above_everything(window: &WebviewWindow) {
    let overlay = window.clone();

    if let Err(error) = window.run_on_main_thread(move || raise(&overlay)) {
        tracing::warn!("could not raise the overlay: {error}");
    }
}

fn raise(window: &WebviewWindow) {
    let Some(native) = native_window(window) else {
        return;
    };

    native.setLevel(CG_SCREEN_SAVER_WINDOW_LEVEL as NSWindowLevel);
    native.setHidesOnDeactivate(false);

    join_every_space(&native);
}

/// A window of an app that owns a Dock icon stays on the space it was opened on
/// however its collection behaviour is set: only an NSPanel joins every space.
/// The original class comes back once the flags are set, because keeping the
/// window an NSPanel drops the KVO observers AppKit holds on it.
fn join_every_space(window: &NSWindow) {
    let object: *mut AnyObject = (window as *const NSWindow).cast_mut().cast();
    let original = unsafe { ffi::object_setClass(object, NSPanel::class()) };

    window.setStyleMask(window.styleMask() | NSWindowStyleMask::NonactivatingPanel);
    window.setCollectionBehavior(
        NSWindowCollectionBehavior::CanJoinAllSpaces
            | NSWindowCollectionBehavior::FullScreenAuxiliary
            | NSWindowCollectionBehavior::Stationary
            | NSWindowCollectionBehavior::IgnoresCycle,
    );
    window.orderFrontRegardless();

    unsafe { ffi::object_setClass(object, original) };
}

fn native_window(window: &WebviewWindow) -> Option<Retained<NSWindow>> {
    let handle = window
        .ns_window()
        .inspect_err(|error| tracing::warn!("could not reach the overlay window: {error}"))
        .ok()?;

    let pointer = handle.cast::<NSWindow>();

    unsafe { Retained::retain(pointer) }
}
