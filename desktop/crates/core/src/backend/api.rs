use async_trait::async_trait;

use crate::{
    domain::{
        GenerationMode, Language, Meeting, MeetingDetails, MeetingId, MeetingProfile, Profile,
        UserSettings,
    },
    error::Result,
};

use super::{
    endpoint::{Health, Tokens},
    generate::DeltaStream,
};

#[async_trait]
pub trait BackendApi: Send + Sync {
    async fn health(&self) -> Result<Health>;

    async fn exchange_code(&self, code: &str) -> Result<Tokens>;

    async fn me(&self) -> Result<Profile>;

    async fn user_settings(&self) -> Result<UserSettings>;

    async fn save_user_settings(&self, settings: &UserSettings) -> Result<UserSettings>;

    async fn create_meeting(&self, profile: MeetingProfile, language: Language) -> Result<Meeting>;

    async fn finish_meeting(&self, id: &MeetingId) -> Result<Meeting>;

    async fn list_meetings(&self) -> Result<Vec<Meeting>>;

    async fn meeting(&self, id: &MeetingId) -> Result<MeetingDetails>;

    fn generate(&self, id: &MeetingId, mode: GenerationMode) -> DeltaStream<'_>;
}
