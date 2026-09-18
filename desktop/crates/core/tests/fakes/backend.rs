use std::sync::atomic::{AtomicUsize, Ordering};

use async_trait::async_trait;
use meet_copilot_core::{
    backend::{BackendApi, Health, Tokens},
    domain::{
        Generation, Language, Meeting, MeetingDetails, MeetingId, MeetingProfile, MeetingStatus,
        Profile, TranscriptSegment, Usage, UserSettings,
    },
    error::{Error, Result},
};

#[derive(Default)]
pub struct FakeBackend {
    created: AtomicUsize,
    finished: AtomicUsize,
}

impl FakeBackend {
    pub fn created_meetings(&self) -> usize {
        self.created.load(Ordering::SeqCst)
    }

    pub fn finished_meetings(&self) -> usize {
        self.finished.load(Ordering::SeqCst)
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
