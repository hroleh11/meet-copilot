use std::{
    sync::{
        atomic::{AtomicUsize, Ordering},
        Mutex,
    },
    time::Duration,
};

use async_trait::async_trait;
use futures_util::{stream, StreamExt};
use meet_copilot_core::{
    backend::{BackendApi, Delta, DeltaStream, Health, Tokens},
    backend_failure::BackendFailure,
    domain::{
        Generation, GenerationMode, Language, Meeting, MeetingDetails, MeetingId, MeetingProfile,
        MeetingStatus, Profile, TokenUsage, TranscriptSegment, Usage, UserSettings,
    },
    error::{Error, Result},
};

#[derive(Debug, Clone)]
pub enum Answer {
    Text(String),
    Done(String),
    Failed(String),
}

impl Answer {
    fn into_delta(self) -> Result<Delta> {
        match self {
            Self::Text(text) => Ok(Delta::Text(text)),
            Self::Done(generation_id) => Ok(Delta::Done {
                generation_id,
                stop_reason: None,
                usage: TokenUsage::default(),
            }),
            Self::Failed(message) => Err(Error::backend(BackendFailure::Unexpected, Some(message))),
        }
    }
}

#[derive(Default)]
pub struct FakeBackend {
    created: AtomicUsize,
    finished: AtomicUsize,
    answer: Mutex<Vec<Answer>>,
    pace: Mutex<Duration>,
    asked: Mutex<Vec<GenerationMode>>,
}

impl FakeBackend {
    pub fn created_meetings(&self) -> usize {
        self.created.load(Ordering::SeqCst)
    }

    pub fn finished_meetings(&self) -> usize {
        self.finished.load(Ordering::SeqCst)
    }

    pub fn answer_with(&self, answer: Vec<Answer>) {
        *self.answer.lock().expect("lock") = answer;
    }

    pub fn pace_answer(&self, pace: Duration) {
        *self.pace.lock().expect("lock") = pace;
    }

    pub fn modes_asked(&self) -> Vec<GenerationMode> {
        self.asked.lock().expect("lock").clone()
    }
}

fn meeting(status: MeetingStatus) -> Meeting {
    Meeting {
        id: "11111111-1111-4111-8111-111111111111".to_owned(),
        profile: MeetingProfile::Daily,
        language: Language::Uk,
        title: None,
        status,
        started_at: "2026-09-18T00:00:00.000Z".to_owned(),
        ended_at: match status {
            MeetingStatus::Finished => Some("2026-09-18T01:00:00.000Z".to_owned()),
            MeetingStatus::Live => None,
        },
    }
}

fn unused<T>() -> Result<T> {
    Err(Error::Audio("the session never calls this".to_owned()))
}

#[async_trait]
impl BackendApi for FakeBackend {
    async fn health(&self) -> Result<Health> {
        unused()
    }

    async fn sign_in(&self, _email: &str, _password: &str) -> Result<Tokens> {
        unused()
    }

    async fn exchange_code(&self, _code: &str) -> Result<Tokens> {
        unused()
    }

    async fn me(&self) -> Result<Profile> {
        unused()
    }

    async fn user_settings(&self) -> Result<UserSettings> {
        unused()
    }

    async fn save_user_settings(&self, _settings: &UserSettings) -> Result<UserSettings> {
        unused()
    }

    async fn create_meeting(
        &self,
        _profile: MeetingProfile,
        _language: Language,
    ) -> Result<Meeting> {
        self.created.fetch_add(1, Ordering::SeqCst);

        Ok(meeting(MeetingStatus::Live))
    }

    async fn finish_meeting(&self, _id: &MeetingId) -> Result<Meeting> {
        self.finished.fetch_add(1, Ordering::SeqCst);

        Ok(meeting(MeetingStatus::Finished))
    }

    async fn list_meetings(&self) -> Result<Vec<Meeting>> {
        Ok(vec![meeting(MeetingStatus::Finished)])
    }

    fn generate(&self, _id: &MeetingId, mode: GenerationMode) -> DeltaStream<'_> {
        self.asked.lock().expect("lock").push(mode);

        let answer = self.answer.lock().expect("lock").clone();
        let pace = *self.pace.lock().expect("lock");

        Box::pin(stream::iter(answer).then(move |step| async move {
            if !pace.is_zero() {
                tokio::time::sleep(pace).await;
            }

            step.into_delta()
        }))
    }

    async fn meeting(&self, _id: &MeetingId) -> Result<MeetingDetails> {
        Ok(MeetingDetails {
            meeting: meeting(MeetingStatus::Finished),
            summary: None,
            segments: Vec::<TranscriptSegment>::new(),
            generations: Vec::<Generation>::new(),
            usage: Usage::default(),
        })
    }
}
