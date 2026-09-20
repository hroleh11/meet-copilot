mod fakes;

use std::{sync::Arc, time::Duration};

use cueline_core::{
    audio::SAMPLES_PER_FRAME,
    backend::SttEvent,
    domain::{Language, MeetingProfile, MeetingStart, SessionState, Speaker},
    session::{Session, SessionDeps, StartRequest},
};
use fakes::{recorded_clip, FakeAccess, FakeBackend, RecordedSources, TranscribingGateway};
use tokio::{
    sync::mpsc,
    time::{sleep, timeout, Instant},
};

const SETTLE_TIMEOUT: Duration = Duration::from_secs(5);

struct Harness {
    session: Session,
    backend: Arc<FakeBackend>,
    gateway: Arc<TranscribingGateway>,
    sources: Arc<RecordedSources>,
    transcript: mpsc::Receiver<SttEvent>,
    sender: mpsc::Sender<SttEvent>,
}

fn harness() -> Harness {
    let backend = Arc::new(FakeBackend::default());
    let gateway = Arc::new(TranscribingGateway::default());
    let sources = Arc::new(RecordedSources::default());
    let (sender, transcript) = mpsc::channel(64);

    Harness {
        session: Session::new(SessionDeps {
            backend: backend.clone(),
            gateway: gateway.clone(),
            access: Arc::new(FakeAccess::allowed()),
            sources: sources.clone(),
        }),
        backend,
        gateway,
        sources,
        transcript,
        sender,
    }
}

async fn wait_for_clip(gateway: &TranscribingGateway, samples: usize) {
    let deadline = Instant::now() + SETTLE_TIMEOUT;

    while Instant::now() < deadline {
        let both_heard = [Speaker::Me, Speaker::Other]
            .into_iter()
            .all(|speaker| gateway.heard(speaker).samples >= samples);

        if both_heard {
            return;
        }

        sleep(Duration::from_millis(10)).await;
    }

    panic!("the recording never reached the backend in full");
}

#[tokio::test]
async fn a_recorded_meeting_reaches_the_backend_whole_and_ends_cleanly() {
    let clip = recorded_clip();
    let mut harness = harness();

    harness
        .session
        .start(
            StartRequest {
                meeting: MeetingStart {
                    profile: MeetingProfile::Daily,
                    language: Language::Uk,
                    reply_language: None,
                    project_id: None,
                    resource_ids: Vec::new(),
                },
                input_device: None,
            },
            harness.sender.clone(),
        )
        .await
        .expect("the session starts");

    wait_for_clip(&harness.gateway, clip.len()).await;

    for speaker in [Speaker::Me, Speaker::Other] {
        let heard = harness.gateway.heard(speaker);

        assert_eq!(heard.samples, clip.len(), "{speaker:?} lost audio");
        assert_eq!(heard.oversized_frames, 0, "{speaker:?} sent a broken frame");
        assert_eq!(heard.frames, clip.len().div_ceil(SAMPLES_PER_FRAME));
    }

    harness.session.stop().await.expect("the session stops");

    assert_eq!(harness.session.state(), SessionState::Idle);
    assert_eq!(harness.backend.finished_meetings(), 1);
    assert_eq!(harness.sources.stopped(), 2);

    let mut transcribed = Vec::new();

    while let Ok(Some(event)) = timeout(SETTLE_TIMEOUT, harness.transcript.recv()).await {
        if let SttEvent::Final { speaker, text, .. } = event {
            transcribed.push((speaker, text));
        }

        if transcribed.len() == 2 {
            break;
        }
    }

    transcribed.sort_by_key(|(speaker, _)| format!("{speaker:?}"));

    assert_eq!(
        transcribed,
        vec![
            (Speaker::Me, format!("{} samples", clip.len())),
            (Speaker::Other, format!("{} samples", clip.len())),
        ]
    );
}
