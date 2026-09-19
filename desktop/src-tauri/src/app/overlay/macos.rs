use std::ptr::NonNull;

use block2::RcBlock;
use objc2::rc::Retained;
use objc2_app_kit::{
    NSWindow, NSWindowCollectionBehavior, NSWindowLevel, NSWorkspace,
    NSWorkspaceActiveSpaceDidChangeNotification,
};
use objc2_foundation::{NSNotification, NSOperationQueue};
use tauri::{AppHandle, Manager, WebviewWindow};

use super::LABEL;

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

    native.orderFrontRegardless();
}

/// A window that joins every space still stays behind on the space it was ordered
/// front in, so it is ordered front again whenever the user switches spaces.
pub fn follow_spaces(app: &AppHandle) {
    let handle = app.clone();

    let on_change = RcBlock::new(move |_: NonNull<NSNotification>| {
        let Some(window) = handle.get_webview_window(LABEL) else {
            return;
        };

        if window.is_visible().unwrap_or(false) {
            if let Some(native) = native_window(&window) {
                native.orderFrontRegardless();
            }
        }
    });

    unsafe {
        NSWorkspace::sharedWorkspace()
            .notificationCenter()
            .addObserverForName_object_queue_usingBlock(
                Some(NSWorkspaceActiveSpaceDidChangeNotification),
                None,
                Some(&NSOperationQueue::mainQueue()),
                &on_change,
            );
    }
}

fn native_window(window: &WebviewWindow) -> Option<Retained<NSWindow>> {
    let handle = window
        .ns_window()
        .inspect_err(|error| tracing::warn!("could not reach the overlay window: {error}"))
        .ok()?;

    let pointer = handle.cast::<NSWindow>();

    unsafe { Retained::retain(pointer) }
}
