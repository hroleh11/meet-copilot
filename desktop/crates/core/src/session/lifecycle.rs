use std::sync::Arc;

use tokio::{
    sync::{mpsc, watch},
    task::JoinHandle,
};
use tokio_util::sync::CancellationToken;

use crate::{
    access::AccessPolicy,
    audio::{AudioFrame, AudioSource},
    backend::{BackendApi, SttEvent, SttGateway},
    domain::{Language, Meeting, MeetingId, MeetingStart, SessionState, Speaker},
    error::{Error, Result},
    session::{
        lane::{self, Lane},
        sources::{AudioSources, StartedSources},
    },
};

const FRAME_CHANNEL_CAPACITY: usize = 64;

pub struct SessionDeps {
    pub backend: Arc<dyn BackendApi>,
    pub gateway: Arc<dyn SttGateway>,
    pub access: Arc<dyn AccessPolicy>,
    pub sources: Arc<dyn AudioSources>,
}

pub struct StartRequest {
    pub meeting: MeetingStart,
    pub input_device: Option<String>,
}

#[derive(Debug)]
pub struct StartedSession {
    pub meeting: Meeting,
    pub system_audio_problem: Option<String>,
}

struct Running {
    meeting: Meeting,
    sources: StartedSources,
    cancel: CancellationToken,
    reopen: watch::Sender<u64>,
    lanes: Vec<JoinHandle<()>>,
}

pub struct Session {
    deps: SessionDeps,
    state: SessionState,
    running: Option<Running>,
}

impl Session {
    pub fn new(deps: SessionDeps) -> Self {
        Self {
            deps,
            state: SessionState::Idle,
            running: None,
        }
    }

    pub fn state(&self) -> SessionState {
        self.state
    }

    pub fn meeting_id(&self) -> Option<MeetingId> {
        self.running
            .as_ref()
            .map(|running| running.meeting.id.clone())
    }

    pub async fn start(
        &mut self,
        request: StartRequest,
        transcript: mpsc::Sender<SttEvent>,
    ) -> Result<StartedSession> {
        if self.state != SessionState::Idle {
            return Err(Error::Audio("A meeting is already running".to_owned()));
        }

        self.state = SessionState::Starting;

        match self.begin(request, transcript).await {
            Ok(started) => {
                self.state = SessionState::Listening;
                Ok(started)
            }
            Err(error) => {
                self.state = SessionState::Idle;
                Err(error)
            }
        }
    }

    pub async fn stop(&mut self) -> Result<Option<Meeting>> {
        let Some(running) = self.running.take() else {
            self.state = SessionState::Idle;
            return Ok(None);
        };

        self.state = SessionState::Stopping;

        running.cancel.cancel();
        let stopped = running.sources.stop();

        for lane in running.lanes {
            let _ = lane.await;
        }

        let finished = self.deps.backend.finish_meeting(&running.meeting.id).await;
        self.state = SessionState::Idle;

        stopped?;
        finished.map(Some)
    }

    async fn begin(
        &mut self,
        request: StartRequest,
        transcript: mpsc::Sender<SttEvent>,
    ) -> Result<StartedSession> {
        let entitlement = self.deps.access.check().await?;

        if !entitlement.is_allowed() {
            return Err(Error::Access(
                "This account cannot start meetings right now".to_owned(),
            ));
        }

        let meeting = self.deps.backend.create_meeting(&request.meeting).await?;

        match self.attach(&meeting, request.input_device, transcript) {
            Ok((running, problem)) => {
                self.running = Some(running);

                Ok(StartedSession {
                    meeting,
                    system_audio_problem: problem,
                })
            }
            Err(error) => {
                let _ = self.deps.backend.finish_meeting(&meeting.id).await;
                Err(error)
            }
        }
    }

    /// An interview can open in one language and carry on in another. Changing it
    /// tells the lanes to take a new socket, and the backend reads the language
    /// from the meeting row as they connect, so nothing else has to know.
    pub async fn switch_language(
        &mut self,
        language: Language,
        reply_language: Option<Language>,
    ) -> Result<Meeting> {
        let Some(running) = self.running.as_mut() else {
            return Err(Error::Session("No meeting is running".to_owned()));
        };

        let meeting = self
            .deps
            .backend
            .set_meeting_language(&running.meeting.id, language, reply_language)
            .await?;

        running.meeting = meeting.clone();
        running.reopen.send_modify(|generation| *generation += 1);

        Ok(meeting)
    }

    fn attach(
        &self,
        meeting: &Meeting,
        input_device: Option<String>,
        transcript: mpsc::Sender<SttEvent>,
    ) -> Result<(Running, Option<String>)> {
        let cancel = CancellationToken::new();
        let (reopen, listener) = watch::channel(0);
        let mut started = Vec::new();
        let mut lanes = Vec::new();

        let mut microphone = self.deps.sources.microphone(input_device);
        lanes.push(self.spawn_lane(
            meeting,
            Speaker::Me,
            &mut *microphone,
            transcript.clone(),
            &cancel,
            &listener,
        )?);
        started.push(microphone);

        let problem = match self.deps.sources.system_audio() {
            None => Some("Capturing the other side is not available on this system".to_owned()),
            Some(mut system_audio) => {
                match self.spawn_lane(
                    meeting,
                    Speaker::Other,
                    &mut *system_audio,
                    transcript,
                    &cancel,
                    &listener,
                ) {
                    Ok(lane) => {
                        lanes.push(lane);
                        started.push(system_audio);
                        None
                    }
                    Err(error) => Some(error.to_string()),
                }
            }
        };

        Ok((
            Running {
                meeting: meeting.clone(),
                sources: StartedSources::new(started),
                cancel,
                reopen,
                lanes,
            },
            problem,
        ))
    }

    fn spawn_lane(
        &self,
        meeting: &Meeting,
        speaker: Speaker,
        source: &mut dyn AudioSource,
        transcript: mpsc::Sender<SttEvent>,
        cancel: &CancellationToken,
        reopen: &watch::Receiver<u64>,
    ) -> Result<JoinHandle<()>> {
        let (frames_tx, frames_rx) = mpsc::channel::<AudioFrame>(FRAME_CHANNEL_CAPACITY);

        source.start(frames_tx)?;

        Ok(tokio::spawn(lane::run(Lane {
            speaker,
            meeting_id: meeting.id.clone(),
            gateway: Arc::clone(&self.deps.gateway),
            frames: frames_rx,
            events: transcript,
            cancel: cancel.clone(),
            reopen: reopen.clone(),
        })))
    }
}
