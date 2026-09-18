use meet_copilot_core::{
    audio::AudioFrame,
    backend::{SttEvent, SttMessage, Tokens},
    domain::{
        GenerationMode, Language, Meeting, MeetingDetails, MeetingProfile, MeetingStatus, Speaker,
        UserSettings,
    },
};
use serde_json::{json, Value};

fn roundtrip<T>(value: &T, expected: Value)
where
    T: serde::Serialize + serde::de::DeserializeOwned + PartialEq + std::fmt::Debug,
{
    let encoded = serde_json::to_value(value).expect("serializes");
    assert_eq!(encoded, expected);

    let decoded: T = serde_json::from_value(expected).expect("deserializes");
    assert_eq!(&decoded, value);
}

#[test]
fn enums_use_the_spelling_the_backend_sends() {
    roundtrip(&Language::Uk, json!("uk"));
    roundtrip(&Speaker::Other, json!("other"));
    roundtrip(
        &MeetingProfile::InterviewCandidate,
        json!("interview_candidate"),
    );
    roundtrip(&MeetingStatus::Finished, json!("finished"));
    roundtrip(&GenerationMode::Alternative, json!("alternative"));
}

#[test]
fn a_meeting_matches_the_backend_response() {
    roundtrip(
        &Meeting {
            id: "11111111-1111-4111-8111-111111111111".to_owned(),
            profile: MeetingProfile::Daily,
            language: Language::Uk,
            title: Some("Дейлі".to_owned()),
            status: MeetingStatus::Live,
            started_at: "2026-09-18T00:00:00.000Z".to_owned(),
            ended_at: None,
        },
        json!({
            "id": "11111111-1111-4111-8111-111111111111",
            "profile": "daily",
            "language": "uk",
            "title": "Дейлі",
            "status": "live",
            "startedAt": "2026-09-18T00:00:00.000Z",
            "endedAt": null
        }),
    );
}

#[test]
fn meeting_details_stay_flat_like_the_backend_class() {
    let details: MeetingDetails = serde_json::from_value(json!({
        "id": "22222222-2222-4222-8222-222222222222",
        "profile": "client_call",
        "language": "en",
        "title": null,
        "status": "finished",
        "startedAt": "2026-09-18T00:00:00.000Z",
        "endedAt": "2026-09-18T01:00:00.000Z",
        "summary": "Обговорили ціну.",
        "segments": [{
            "id": "seg-1",
            "speaker": "other",
            "text": "Чому так дорого?",
            "startMs": 1000,
            "durationMs": 900
        }],
        "generations": [{
            "id": "gen-1",
            "mode": "reply",
            "output": "Бо це вся робота.",
            "createdAt": "2026-09-18T00:30:00.000Z"
        }],
        "usage": {
            "inputTokens": 120,
            "cachedInputTokens": 64,
            "outputTokens": 18,
            "audioSeconds": 42
        }
    }))
    .expect("deserializes");

    assert_eq!(details.meeting.profile, MeetingProfile::ClientCall);
    assert_eq!(details.segments[0].speaker, Speaker::Other);
    assert_eq!(details.generations[0].mode, GenerationMode::Reply);
    assert_eq!(details.usage.cached_input_tokens, 64);
    assert_eq!(details.summary.as_deref(), Some("Обговорили ціну."));
}

#[test]
fn user_settings_allow_an_empty_style() {
    roundtrip(
        &UserSettings {
            style: None,
            default_language: Language::Ru,
            default_profile: MeetingProfile::Daily,
        },
        json!({ "style": null, "defaultLanguage": "ru", "defaultProfile": "daily" }),
    );
}

#[test]
fn tokens_match_the_exchange_response() {
    roundtrip(
        &Tokens {
            access_token: "at".to_owned(),
            refresh_token: "rt".to_owned(),
            expires_in: 900,
        },
        json!({ "accessToken": "at", "refreshToken": "rt", "expiresIn": 900 }),
    );
}

#[test]
fn speech_messages_become_events() {
    let partial: SttMessage =
        serde_json::from_value(json!({ "type": "partial", "speaker": "me", "text": "приві" }))
            .expect("deserializes");

    assert_eq!(
        SttEvent::from(partial),
        SttEvent::Partial {
            speaker: Speaker::Me,
            text: "приві".to_owned(),
        }
    );

    let failure: SttMessage =
        serde_json::from_value(json!({ "type": "error", "message": "Speech recognition failed" }))
            .expect("deserializes");

    assert_eq!(
        SttEvent::from(failure),
        SttEvent::Failed {
            message: "Speech recognition failed".to_owned(),
        }
    );
}

#[test]
fn a_frame_serializes_as_little_endian_samples() {
    let frame = AudioFrame::new(Speaker::Me, vec![0, 1, -1, i16::MAX]);

    assert_eq!(frame.to_le_bytes(), vec![0, 0, 1, 0, 255, 255, 255, 127]);
}

#[test]
fn silence_has_no_level_and_a_full_scale_tone_has_all_of_it() {
    assert_eq!(AudioFrame::new(Speaker::Me, vec![0; 16]).level(), 0.0);

    let loud = AudioFrame::new(Speaker::Me, vec![i16::MAX; 16]).level();
    assert!(
        (loud - 1.0).abs() < 0.001,
        "expected full scale, got {loud}"
    );
}
