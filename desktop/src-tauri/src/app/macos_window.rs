use objc2::rc::Retained;
use objc2::runtime::AnyObject;
use objc2::{ffi, ClassType};
use objc2_app_kit::{
    NSPanel, NSWindow, NSWindowCollectionBehavior, NSWindowLevel, NSWindowStyleMask,
};
use tauri::WebviewWindow;

const CG_SCREEN_SAVER_WINDOW_LEVEL: i32 = 1000;

/// A nonactivating panel takes the keyboard and the first click without making
/// the app active, which is what keeps the user on the space they were on.
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum Key {
    Takes,
    Leaves,
}

pub fn float_above_everything(window: &WebviewWindow, key: Key) {
    let raised = window.clone();

    if let Err(error) = window.run_on_main_thread(move || raise(&raised, key)) {
        tracing::warn!("could not raise the window: {error}");
    }
}

fn raise(window: &WebviewWindow, key: Key) {
    let Some(native) = native_window(window) else {
        return;
    };

    native.setLevel(CG_SCREEN_SAVER_WINDOW_LEVEL as NSWindowLevel);
    native.setHidesOnDeactivate(false);

    join_every_space(&native, key);
}

/// A window of an app that owns a Dock icon stays on the space it was opened on
/// however its collection behaviour is set: only an NSPanel joins every space.
/// The original class comes back once the flags are set, because keeping the
/// window an NSPanel drops the KVO observers AppKit holds on it. `NonactivatingPanel`
/// stays on: a window that activates the app drags the user to the space the app
/// lives on, which is the opposite of joining every space.
fn join_every_space(window: &NSWindow, key: Key) {
    let object: *mut AnyObject = (window as *const NSWindow).cast_mut().cast();
    let original = unsafe { ffi::object_setClass(object, NSPanel::class()) };

    window.setStyleMask(window.styleMask() | NSWindowStyleMask::NonactivatingPanel);
    window.setCollectionBehavior(
        NSWindowCollectionBehavior::CanJoinAllSpaces
            | NSWindowCollectionBehavior::FullScreenAuxiliary
            | NSWindowCollectionBehavior::Stationary
            | NSWindowCollectionBehavior::IgnoresCycle,
    );
    match key {
        Key::Takes => window.makeKeyAndOrderFront(None),
        Key::Leaves => window.orderFrontRegardless(),
    }

    unsafe { ffi::object_setClass(object, original) };
}

fn native_window(window: &WebviewWindow) -> Option<Retained<NSWindow>> {
    let handle = window
        .ns_window()
        .inspect_err(|error| tracing::warn!("could not reach the native window: {error}"))
        .ok()?;

    let pointer = handle.cast::<NSWindow>();

    unsafe { Retained::retain(pointer) }
}
