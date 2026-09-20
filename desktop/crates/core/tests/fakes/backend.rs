use std::{
    sync::{
        atomic::{AtomicUsize, Ordering},
        Mutex,
    },
    time::Duration,
};

use async_trait::async_trait;
use cueline_core::{
    backend::{
        BackendApi, ChatId, ChatMessage, ChatSession, ChatStream, Delta, DeltaStream, Health,
        Tokens,
    },
    backend_failure::BackendFailure,
    domain::{
        Generation, GenerationMode, Language, Meeting, MeetingDetails, MeetingId, MeetingProfile,
        MeetingScope, MeetingStart, MeetingStatus, NewResourceFile, Profile, Project, ProjectId,
        Resource, ResourceContent, ResourceId, ResourceLimits, ResourceScope, TokenUsage,
        TranscriptSegment, Usage, UserSettings,
    },
    error::{Error, Result},
    screenshot::Screenshot,
};
use futures_util::{stream, StreamExt};

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
    pictures: Mutex<Vec<Option<Screenshot>>>,
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

    pub fn pictures_asked(&self) -> Vec<Option<Screenshot>> {
        self.pictures.lock().expect("lock").clone()
    }
}

fn meeting(status: MeetingStatus) -> Meeting {
    Meeting {
        id: "11111111-1111-4111-8111-111111111111".to_owned(),
        project_id: None,
        profile: MeetingProfile::Daily,
        language: Language::Uk,
        reply_language: None,
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

    async fn create_meeting(&self, _start: &MeetingStart) -> Result<Meeting> {
        self.created.fetch_add(1, Ordering::SeqCst);

        Ok(meeting(MeetingStatus::Live))
    }

    async fn finish_meeting(&self, _id: &MeetingId) -> Result<Meeting> {
        self.finished.fetch_add(1, Ordering::SeqCst);

        Ok(meeting(MeetingStatus::Finished))
    }

    async fn list_meetings(
        &self,
        _limit: u32,
        _cursor: Option<&str>,
        _scope: &MeetingScope,
    ) -> Result<Vec<Meeting>> {
        Ok(vec![meeting(MeetingStatus::Finished)])
    }

    async fn rename_meeting(&self, _id: &MeetingId, _title: &str) -> Result<Meeting> {
        unused()
    }

    async fn move_meeting(&self, _id: &MeetingId, _project: Option<&ProjectId>) -> Result<Meeting> {
        unused()
    }

    async fn set_meeting_language(
        &self,
        _id: &MeetingId,
        _language: Language,
        _reply_language: Option<Language>,
    ) -> Result<Meeting> {
        unused()
    }

    async fn delete_meeting(&self, _id: &MeetingId) -> Result<()> {
        unused()
    }

    async fn list_resources(&self, _scope: &ResourceScope) -> Result<Vec<Resource>> {
        unused()
    }

    async fn upload_resource(
        &self,
        _scope: &ResourceScope,
        _file: &NewResourceFile,
    ) -> Result<Resource> {
        unused()
    }

    async fn add_resource_text(
        &self,
        _scope: &ResourceScope,
        _name: &str,
        _text: &str,
    ) -> Result<Resource> {
        unused()
    }

    async fn resource(&self, _id: &ResourceId) -> Result<Resource> {
        unused()
    }

    async fn resource_content(&self, _id: &ResourceId) -> Result<ResourceContent> {
        unused()
    }

    async fn resource_limits(&self) -> Result<ResourceLimits> {
        unused()
    }

    async fn delete_resource(&self, _id: &ResourceId) -> Result<()> {
        unused()
    }

    async fn list_projects(&self) -> Result<Vec<Project>> {
        Ok(Vec::new())
    }

    async fn create_project(&self, _name: &str) -> Result<Project> {
        unused()
    }

    async fn rename_project(&self, _id: &ProjectId, _name: &str) -> Result<Project> {
        unused()
    }

    async fn delete_project(&self, _id: &ProjectId) -> Result<()> {
        unused()
    }

    async fn meeting_chats(
        &self,
        _id: &MeetingId,
        _query: Option<&str>,
    ) -> Result<Vec<ChatSession>> {
        Ok(Vec::new())
    }

    async fn start_meeting_chat(&self, _id: &MeetingId) -> Result<ChatSession> {
        unused()
    }

    async fn chat_messages(&self, _id: &MeetingId, _chat: &ChatId) -> Result<Vec<ChatMessage>> {
        Ok(Vec::new())
    }

    async fn delete_meeting_chat(&self, _id: &MeetingId, _chat: &ChatId) -> Result<()> {
        unused()
    }

    fn ask_in_chat(&self, _id: &MeetingId, _chat: &ChatId, _question: &str) -> ChatStream<'_> {
        Box::pin(stream::empty())
    }

    fn generate(
        &self,
        _id: &MeetingId,
        mode: GenerationMode,
        screenshot: Option<&Screenshot>,
    ) -> DeltaStream<'_> {
        self.asked.lock().expect("lock").push(mode);
        self.pictures
            .lock()
            .expect("lock")
            .push(screenshot.cloned());

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
            overview: None,
            segments: Vec::<TranscriptSegment>::new(),
            generations: Vec::<Generation>::new(),
            resources: Vec::<Resource>::new(),
            usage: Usage::default(),
        })
    }
}
