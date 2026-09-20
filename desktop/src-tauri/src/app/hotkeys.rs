use cueline_core::{domain::GenerationMode, error::Result, settings::Hotkeys};
use tauri::AppHandle;
use tauri_plugin_global_shortcut::{GlobalShortcutExt, ShortcutState};

use crate::{
    app::{answers, overlay, Emitter},
    command_error::CommandError,
};

#[derive(Debug, Clone, Copy)]
enum Action {
    Ask(GenerationMode),
    AskAboutScreen,
    ToggleOverlay,
    ToggleOverlayInteraction,
}

pub fn register(app: &AppHandle, hotkeys: &Hotkeys) {
    if let Err(error) = app.global_shortcut().unregister_all() {
        tracing::warn!("could not release the previous hotkeys: {error}");
    }

    bind(app, &hotkeys.reply, Action::Ask(GenerationMode::Reply));
    bind(
        app,
        &hotkeys.alternative,
        Action::Ask(GenerationMode::Alternative),
    );
    bind(app, &hotkeys.screenshot, Action::AskAboutScreen);
    bind(app, &hotkeys.hide, Action::ToggleOverlay);
    bind(app, &hotkeys.interact, Action::ToggleOverlayInteraction);
}

fn bind(app: &AppHandle, shortcut: &str, action: Action) {
    let registered = app
        .global_shortcut()
        .on_shortcut(shortcut, move |app, _, event| {
            if event.state == ShortcutState::Pressed {
                run(app.clone(), action);
            }
        });

    if let Err(error) = registered {
        tracing::warn!("could not register the hotkey {shortcut}: {error}");
    }
}

fn run(app: AppHandle, action: Action) {
    match action {
        Action::ToggleOverlay => overlay::toggle(&app),
        Action::ToggleOverlayInteraction => overlay::toggle_interaction(&app),
        Action::Ask(mode) => {
            tauri::async_runtime::spawn(async move {
                report(&app, answers::ask(&app, mode).await);
            });
        }
        Action::AskAboutScreen => {
            tauri::async_runtime::spawn(async move {
                report(&app, answers::ask_about_screen(&app).await);
            });
        }
    }
}

fn report(app: &AppHandle, outcome: Result<()>) {
    if let Err(error) = outcome {
        tracing::warn!("the hotkey could not be served: {error}");
        Emitter::new(app.clone()).app_error(CommandError::from(error).into());
    }
}
