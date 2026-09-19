use std::sync::Arc;

use meet_copilot_core::{
    access::AlwaysAllowed,
    backend::{BackendClient, SttEvent},
    domain::{MeetingId, MeetingStart, SessionState, Speaker},
    error::Result,
    session::{Session, SessionDeps, StartRequest, StartedSession},
};
use tokio::{sync::mpsc, task::JoinHandle};

use crate::{
    app::{platform_sources::PlatformSources, Emitter},
    events::{SessionStateEvent, SourceStatusEvent, TranscriptSegmentEvent},
};

const TRANSCRIPT_CHANNEL_CAPACITY: usize = 128;

pub struct MeetingSession {
    session: Session,
    forwarder: Option<JoinHandle<()>>,
}

impl MeetingSession {
    pub fn new(backend: Arc<BackendClient>) -> Self {
        Self {
            session: Session::new(SessionDeps {
                backend: backend.clone(),
                gateway: backend,
                access: Arc::new(AlwaysAllowed),
                sources: Arc::new(PlatformSources),
            }),
            forwarder: None,
        }
    }

    pub fn state(&self) -> SessionState {
        self.session.state()
    }

    pub fn meeting_id(&self) -> Option<MeetingId> {
        self.session.meeting_id()
    }

    pub async fn start(
        &mut self,
        meeting: MeetingStart,
        input_device: Option<String>,
        emitter: Emitter,
    ) -> Result<StartedSession> {
        let (transcript, incoming) = mpsc::channel::<SttEvent>(TRANSCRIPT_CHANNEL_CAPACITY);

        emitter.session_state(SessionStateEvent {
            state: SessionState::Starting,
            meeting_id: None,
            message: None,
        });

        let started = self
            .session
            .start(
                StartRequest {
                    meeting,
                    input_device,
                },
                transcript,
            )
            .await
            .inspect_err(|error| {
                emitter.session_state(SessionStateEvent {
                    state: SessionState::Idle,
                    meeting_id: None,
                    message: Some(error.to_string()),
                });
            })?;

        self.forwarder = Some(tokio::spawn(forward(incoming, emitter.clone())));

        emitter.session_state(SessionStateEvent {
            state: SessionState::Listening,
            meeting_id: Some(started.meeting.id.clone()),
            message: started.system_audio_problem.clone(),
        });

        announce_sources(&emitter, started.system_audio_problem.is_none());

        Ok(started)
    }

    pub async fn stop(&mut self, emitter: Emitter) -> Result<()> {
        emitter.session_state(SessionStateEvent {
            state: SessionState::Stopping,
            meeting_id: self.session.meeting_id(),
            message: None,
        });

        let stopped = self.session.stop().await;

        if let Some(forwarder) = self.forwarder.take() {
            forwarder.abort();
        }

        emitter.session_state(SessionStateEvent {
            state: SessionState::Idle,
            meeting_id: None,
            message: stopped.as_ref().err().map(ToString::to_string),
        });

        stopped.map(|_| ())
    }
}

fn announce_sources(emitter: &Emitter, system_audio: bool) {
    emitter.source_status(SourceStatusEvent {
        speaker: Speaker::Me,
        active: true,
    });

    emitter.source_status(SourceStatusEvent {
        speaker: Speaker::Other,
        active: system_audio,
    });
}

async fn forward(mut incoming: mpsc::Receiver<SttEvent>, emitter: Emitter) {
    while let Some(event) = incoming.recv().await {
        match event {
            SttEvent::Partial { speaker, text } => {
                emitter.transcript_segment(TranscriptSegmentEvent {
                    id: interim_id(speaker),
                    speaker,
                    text,
                    is_final: false,
                });
            }
            SttEvent::Final {
                id, speaker, text, ..
            } => {
                emitter.transcript_segment(TranscriptSegmentEvent {
                    id,
                    speaker,
                    text,
                    is_final: true,
                });
            }
            SttEvent::Failed { message } => {
                emitter.session_state(SessionStateEvent {
                    state: SessionState::Listening,
                    meeting_id: None,
                    message: Some(message),
                });
            }
        }
    }
}

/// One interim line per speaker, replaced in place until the final arrives.
fn interim_id(speaker: Speaker) -> String {
    format!("interim-{}", speaker.as_query_value())
}
