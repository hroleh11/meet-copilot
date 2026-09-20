use std::sync::Arc;

use cueline_core::{
    access::AlwaysAllowed,
    backend::BackendClient,
    domain::{GenerationMode, MeetingId},
    error::{Error, Result},
    generation::{GenerationDeps, GenerationEvent, Generator},
    screenshot::Screenshot,
};
use tauri::{AppHandle, Manager};
use tokio::{sync::mpsc, task::JoinHandle};

use crate::{
    app::{overlay, screen_capture, AppState, Emitter},
    events::{
        GenerationDeltaEvent, GenerationFailedEvent, GenerationFinishedEvent,
        GenerationStartedEvent,
    },
};

const ANSWER_CHANNEL_CAPACITY: usize = 64;

pub struct Answers {
    generator: Generator,
    forwarder: Option<JoinHandle<()>>,
}

impl Answers {
    pub fn new(backend: Arc<BackendClient>) -> Self {
        Self {
            generator: Generator::new(GenerationDeps {
                backend,
                access: Arc::new(AlwaysAllowed),
            }),
            forwarder: None,
        }
    }

    pub async fn ask(
        &mut self,
        meeting_id: MeetingId,
        mode: GenerationMode,
        screenshot: Option<Screenshot>,
        emitter: Emitter,
    ) -> Result<()> {
        let (events, incoming) = mpsc::channel::<GenerationEvent>(ANSWER_CHANNEL_CAPACITY);

        self.generator
            .start(meeting_id, mode, screenshot, events)
            .await?;
        self.silence_previous();
        self.forwarder = Some(tokio::spawn(forward(incoming, emitter)));

        Ok(())
    }

    pub fn cancel(&mut self) {
        self.generator.cancel();
        self.silence_previous();
    }

    fn silence_previous(&mut self) {
        if let Some(forwarder) = self.forwarder.take() {
            forwarder.abort();
        }
    }
}

pub async fn ask(app: &AppHandle, mode: GenerationMode) -> Result<()> {
    let meeting_id = running_meeting(app).await?;

    start(app, meeting_id, mode, None).await
}

pub async fn ask_about_screen(app: &AppHandle) -> Result<()> {
    let meeting_id = running_meeting(app).await?;

    match screen_capture::capture_region(app).await? {
        Some(picture) => start(app, meeting_id, GenerationMode::Reply, Some(picture)).await,
        None => Ok(()),
    }
}

async fn running_meeting(app: &AppHandle) -> Result<MeetingId> {
    app.state::<AppState>()
        .session()
        .await
        .lock()
        .await
        .meeting_id()
        .ok_or_else(|| Error::Session("No meeting is running right now".to_owned()))
}

async fn start(
    app: &AppHandle,
    meeting_id: MeetingId,
    mode: GenerationMode,
    screenshot: Option<Screenshot>,
) -> Result<()> {
    overlay::show(app);

    let state = app.state::<AppState>();

    let asked = state
        .answers()
        .await
        .lock()
        .await
        .ask(meeting_id, mode, screenshot, Emitter::new(app.clone()))
        .await;

    asked
}

async fn forward(mut incoming: mpsc::Receiver<GenerationEvent>, emitter: Emitter) {
    while let Some(event) = incoming.recv().await {
        match event {
            GenerationEvent::Started {
                mode,
                with_screenshot,
            } => {
                emitter.generation_started(GenerationStartedEvent {
                    mode,
                    with_screenshot,
                });
            }
            GenerationEvent::Delta { text } => {
                emitter.generation_delta(GenerationDeltaEvent { text });
            }
            GenerationEvent::Finished {
                generation_id,
                usage,
            } => {
                emitter.generation_finished(GenerationFinishedEvent {
                    generation_id,
                    usage,
                });
            }
            GenerationEvent::Failed { message } => {
                emitter.generation_failed(GenerationFailedEvent { message });
            }
        }
    }
}
