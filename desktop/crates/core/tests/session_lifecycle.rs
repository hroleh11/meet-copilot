mod fakes;

use std::{sync::Arc, time::Duration};

use fakes::{FakeAccess, FakeBackend, FakeGateway, FakeSources};
use meet_copilot_core::{
    access::{AccessPolicy, DenialReason, Entitlement},
    backend::SttEvent,
    domain::{Language, MeetingProfile, MeetingStatus, SessionState, Speaker},
    error::Result,
    session::{Session, SessionDeps, StartRequest},
};
use tokio::{sync::mpsc, time::timeout};

fn request() -> StartRequest {
    StartRequest {
        profile: MeetingProfile::Daily,
        language: Language::Uk,
        input_device: None,
    }
}

struct Harness {
    session: Session,
    backend: Arc<FakeBackend>,
    gateway: Arc<FakeGateway>,
    sources: Arc<FakeSources>,
    transcript: mpsc::Receiver<SttEvent>,
    sender: mpsc::Sender<SttEvent>,
}

fn harness(access: Arc<dyn AccessPolicy>) -> Harness {
    let backend = Arc::new(FakeBackend::default());
    let gateway = Arc::new(FakeGateway::default());
    let sources = Arc::new(FakeSources::default());
    let (sender, transcript) = mpsc::channel(64);

    Harness {
        session: Session::new(SessionDeps {
            backend: backend.clone(),
            gateway: gateway.clone(),
            access,
            sources: sources.clone(),
        }),
        backend,
        gateway,
        sources,
        transcript,
        sender,
    }
}

#[tokio::test]
async fn a_fresh_session_is_idle() {
    let harness = harness(Arc::new(FakeAccess::allowed()));

    assert_eq!(harness.session.state(), SessionState::Idle);
    assert_eq!(harness.session.meeting_id(), None);
}

#[tokio::test]
async fn starting_creates_a_meeting_and_opens_both_lanes() -> Result<()> {
    let mut harness = harness(Arc::new(FakeAccess::allowed()));

    let started = harness
        .session
        .start(request(), harness.sender.clone())
        .await?;

    assert_eq!(harness.session.state(), SessionState::Listening);
    assert_eq!(started.meeting.status, MeetingStatus::Live);
    assert_eq!(started.system_audio_problem, None);
    assert_eq!(harness.backend.created_meetings(), 1);
    assert_eq!(harness.sources.started(), 2);

    harness.gateway.wait_for_lanes(2).await;
    assert_eq!(
        harness.gateway.opened_speakers(),
        vec![Speaker::Me, Speaker::Other]
    );

    Ok(())
}

#[tokio::test]
async fn a_denied_entitlement_never_creates_a_meeting() {
    let mut harness = harness(Arc::new(FakeAccess::denied(DenialReason::NoSubscription)));

    let error = harness
        .session
        .start(request(), harness.sender.clone())
        .await
        .expect_err("start is refused");

    assert!(error.to_string().contains("cannot start meetings"));
    assert_eq!(harness.session.state(), SessionState::Idle);
    assert_eq!(harness.backend.created_meetings(), 0);
}

#[tokio::test]
async fn a_microphone_that_will_not_start_finishes_the_meeting_it_created() {
    let mut harness = harness(Arc::new(FakeAccess::allowed()));
    harness.sources.fail_microphone();

    let error = harness
        .session
        .start(request(), harness.sender.clone())
        .await
        .expect_err("start fails");

    assert!(error.to_string().contains("microphone"));
    assert_eq!(harness.session.state(), SessionState::Idle);
    assert_eq!(harness.backend.created_meetings(), 1);
    assert_eq!(harness.backend.finished_meetings(), 1);
}

#[tokio::test]
async fn a_missing_far_side_still_starts_the_meeting() -> Result<()> {
    let mut harness = harness(Arc::new(FakeAccess::allowed()));
    harness.sources.without_system_audio();

    let started = harness
        .session
        .start(request(), harness.sender.clone())
        .await?;

    assert_eq!(harness.session.state(), SessionState::Listening);
    assert!(started.system_audio_problem.is_some());
    assert_eq!(harness.sources.started(), 1);

    Ok(())
}

#[tokio::test]
async fn transcript_from_both_lanes_reaches_the_caller() -> Result<()> {
    let mut harness = harness(Arc::new(FakeAccess::allowed()));

    harness
        .session
        .start(request(), harness.sender.clone())
        .await?;
    harness.gateway.wait_for_lanes(2).await;

    harness.gateway.emit(SttEvent::Partial {
        speaker: Speaker::Me,
        text: "приві".to_owned(),
    });
    harness.gateway.emit(SttEvent::Final {
        id: "segment-1".to_owned(),
        speaker: Speaker::Other,
        text: "Що можна покращити?".to_owned(),
        start_ms: 1_000,
        duration_ms: 900,
    });

    let first = next_event(&mut harness.transcript).await;
    let second = next_event(&mut harness.transcript).await;

    assert!(matches!(
        first,
        SttEvent::Partial {
            speaker: Speaker::Me,
            ..
        }
    ));
    assert!(matches!(
        second,
        SttEvent::Final {
            speaker: Speaker::Other,
            ..
        }
    ));

    Ok(())
}

#[tokio::test]
async fn stopping_finishes_the_meeting_and_releases_the_devices() -> Result<()> {
    let mut harness = harness(Arc::new(FakeAccess::allowed()));

    harness
        .session
        .start(request(), harness.sender.clone())
        .await?;
    let finished = harness
        .session
        .stop()
        .await?
        .expect("a meeting was running");

    assert_eq!(harness.session.state(), SessionState::Idle);
    assert_eq!(finished.status, MeetingStatus::Finished);
    assert_eq!(harness.backend.finished_meetings(), 1);
    assert_eq!(harness.sources.stopped(), 2);
    assert_eq!(harness.session.meeting_id(), None);

    Ok(())
}

#[tokio::test]
async fn stopping_an_idle_session_is_harmless() -> Result<()> {
    let mut harness = harness(Arc::new(FakeAccess::allowed()));

    assert!(harness.session.stop().await?.is_none());
    assert_eq!(harness.backend.finished_meetings(), 0);

    Ok(())
}

#[tokio::test]
async fn a_second_start_is_refused_while_a_meeting_runs() -> Result<()> {
    let mut harness = harness(Arc::new(FakeAccess::allowed()));

    harness
        .session
        .start(request(), harness.sender.clone())
        .await?;
    let error = harness
        .session
        .start(request(), harness.sender.clone())
        .await
        .expect_err("the second start is refused");

    assert!(error.to_string().contains("already running"));
    assert_eq!(harness.backend.created_meetings(), 1);

    Ok(())
}

#[tokio::test]
async fn a_dropped_lane_reopens_against_the_same_meeting() -> Result<()> {
    let mut harness = harness(Arc::new(FakeAccess::allowed()));

    let started = harness
        .session
        .start(request(), harness.sender.clone())
        .await?;
    harness.gateway.wait_for_lanes(2).await;

    harness.gateway.drop_lanes();
    harness.gateway.wait_for_lanes(4).await;

    assert_eq!(
        harness.gateway.meetings_opened(),
        vec![started.meeting.id; 4]
    );
    assert_eq!(harness.backend.created_meetings(), 1);

    Ok(())
}

#[tokio::test]
async fn the_last_utterance_flushed_on_stop_still_reaches_the_caller() -> Result<()> {
    let mut harness = harness(Arc::new(FakeAccess::allowed()));

    harness.gateway.set_tail(
        Speaker::Other,
        SttEvent::Final {
            id: "tail".to_owned(),
            speaker: Speaker::Other,
            text: "the very last thing they said".to_owned(),
            start_ms: 4_000,
            duration_ms: 900,
        },
    );

    harness
        .session
        .start(request(), harness.sender.clone())
        .await?;
    harness.gateway.wait_for_lanes(2).await;
    harness.session.stop().await?;

    let event = next_event(&mut harness.transcript).await;

    assert!(
        matches!(
            &event,
            SttEvent::Final { speaker, text, .. }
                if *speaker == Speaker::Other && text == "the very last thing they said"
        ),
        "expected the flushed tail, saw {event:?}"
    );

    Ok(())
}

async fn next_event(transcript: &mut mpsc::Receiver<SttEvent>) -> SttEvent {
    timeout(Duration::from_secs(2), transcript.recv())
        .await
        .expect("an event arrives in time")
        .expect("the transcript channel stays open")
}

#[tokio::test]
async fn an_allowed_entitlement_is_what_the_policy_says() -> Result<()> {
    assert_eq!(FakeAccess::allowed().check().await?, Entitlement::Allowed);

    Ok(())
}
