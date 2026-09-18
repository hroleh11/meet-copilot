use std::sync::Arc;

use meet_copilot_core::{
    access::AlwaysAllowed,
    backend::BackendClient,
    domain::{GenerationMode, MeetingId},
    error::{Error, Result},
    generation::{GenerationDeps, GenerationEvent, Generator},
};
use tauri::{AppHandle, Manager};
use tokio::{sync::mpsc, task::JoinHandle};

use crate::{
    app::{overlay, AppState, Emitter},
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
        emitter: Emitter,
    ) -> Result<()> {
        let (events, incoming) = mpsc::channel::<GenerationEvent>(ANSWER_CHANNEL_CAPACITY);

        self.generator.start(meeting_id, mode, events).await?;
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
    let state = app.state::<AppState>();

    let meeting_id = state
        .session()
        .await
        .lock()
        .await
        .meeting_id()
        .ok_or_else(|| Error::Audio("No meeting is running right now".to_owned()))?;

    overlay::show(app);

    let asked = state
        .answers()
        .await
        .lock()
        .await
        .ask(meeting_id, mode, Emitter::new(app.clone()))
        .await;

    asked
}

async fn forward(mut incoming: mpsc::Receiver<GenerationEvent>, emitter: Emitter) {
    while let Some(event) = incoming.recv().await {
        match event {
            GenerationEvent::Started { mode } => {
                emitter.generation_started(GenerationStartedEvent { mode });
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
