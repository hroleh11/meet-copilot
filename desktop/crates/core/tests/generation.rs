mod fakes;

use std::{sync::Arc, time::Duration};

use fakes::{Answer, FakeAccess, FakeBackend};
use meet_copilot_core::{
    access::{AccessPolicy, DenialReason},
    domain::{GenerationMode, TokenUsage},
    error::{Error, Result},
    generation::{GenerationDeps, GenerationEvent, Generator},
    screenshot::Screenshot,
};
use tokio::{sync::mpsc, time::timeout};

const MEETING: &str = "11111111-1111-4111-8111-111111111111";

struct Harness {
    generator: Generator,
    backend: Arc<FakeBackend>,
    events: mpsc::Receiver<GenerationEvent>,
    sender: mpsc::Sender<GenerationEvent>,
}

fn harness(access: Arc<dyn AccessPolicy>) -> Harness {
    let backend = Arc::new(FakeBackend::default());
    let (sender, events) = mpsc::channel(64);

    Harness {
        generator: Generator::new(GenerationDeps {
            backend: backend.clone(),
            access,
        }),
        backend,
        events,
        sender,
    }
}

async fn next(events: &mut mpsc::Receiver<GenerationEvent>) -> GenerationEvent {
    timeout(Duration::from_secs(5), events.recv())
        .await
        .expect("an event within five seconds")
        .expect("the channel stays open")
}

#[tokio::test]
async fn an_answer_arrives_piece_by_piece_and_then_finishes() -> Result<()> {
    let mut harness = harness(Arc::new(FakeAccess::allowed()));

    harness.backend.answer_with(vec![
        Answer::Text("Так, ".to_owned()),
        Answer::Text("я готовий.".to_owned()),
        Answer::Done("generation-1".to_owned()),
    ]);

    harness
        .generator
        .start(
            MEETING.to_owned(),
            GenerationMode::Reply,
            None,
            harness.sender.clone(),
        )
        .await?;

    assert_eq!(
        next(&mut harness.events).await,
        GenerationEvent::Started {
            mode: GenerationMode::Reply,
            with_screenshot: false
        }
    );
    assert_eq!(
        next(&mut harness.events).await,
        GenerationEvent::Delta {
            text: "Так, ".to_owned()
        }
    );
    assert_eq!(
        next(&mut harness.events).await,
        GenerationEvent::Delta {
            text: "я готовий.".to_owned()
        }
    );
    assert_eq!(
        next(&mut harness.events).await,
        GenerationEvent::Finished {
            generation_id: "generation-1".to_owned(),
            usage: TokenUsage::default()
        }
    );

    Ok(())
}

#[tokio::test]
async fn the_mode_reaches_the_backend() -> Result<()> {
    let mut harness = harness(Arc::new(FakeAccess::allowed()));

    harness
        .backend
        .answer_with(vec![Answer::Done("generation-1".to_owned())]);

    harness
        .generator
        .start(
            MEETING.to_owned(),
            GenerationMode::Alternative,
            None,
            harness.sender.clone(),
        )
        .await?;

    next(&mut harness.events).await;
    next(&mut harness.events).await;

    assert_eq!(
        harness.backend.modes_asked(),
        vec![GenerationMode::Alternative]
    );

    Ok(())
}

#[tokio::test]
async fn a_failure_from_the_server_is_reported_once() -> Result<()> {
    let mut harness = harness(Arc::new(FakeAccess::allowed()));

    harness.backend.answer_with(vec![
        Answer::Text("почав".to_owned()),
        Answer::Failed("the model refused".to_owned()),
    ]);

    harness
        .generator
        .start(
            MEETING.to_owned(),
            GenerationMode::Reply,
            None,
            harness.sender.clone(),
        )
        .await?;

    next(&mut harness.events).await;
    next(&mut harness.events).await;

    assert_eq!(
        next(&mut harness.events).await,
        GenerationEvent::Failed {
            message: "the model refused".to_owned()
        }
    );

    Ok(())
}

#[tokio::test]
async fn an_answer_that_stops_early_says_so() -> Result<()> {
    let mut harness = harness(Arc::new(FakeAccess::allowed()));

    harness
        .backend
        .answer_with(vec![Answer::Text("половина".to_owned())]);

    harness
        .generator
        .start(
            MEETING.to_owned(),
            GenerationMode::Reply,
            None,
            harness.sender.clone(),
        )
        .await?;

    next(&mut harness.events).await;
    next(&mut harness.events).await;

    assert!(matches!(
        next(&mut harness.events).await,
        GenerationEvent::Failed { .. }
    ));

    Ok(())
}

#[tokio::test]
async fn a_new_request_silences_the_one_before_it() -> Result<()> {
    let mut harness = harness(Arc::new(FakeAccess::allowed()));

    harness.backend.pace_answer(Duration::from_millis(80));
    harness.backend.answer_with(vec![
        Answer::Text("стара".to_owned()),
        Answer::Text("відповідь".to_owned()),
        Answer::Done("generation-1".to_owned()),
    ]);

    harness
        .generator
        .start(
            MEETING.to_owned(),
            GenerationMode::Reply,
            None,
            harness.sender.clone(),
        )
        .await?;

    assert_eq!(
        next(&mut harness.events).await,
        GenerationEvent::Started {
            mode: GenerationMode::Reply,
            with_screenshot: false
        }
    );

    harness.backend.pace_answer(Duration::ZERO);
    harness.backend.answer_with(vec![
        Answer::Text("нова".to_owned()),
        Answer::Done("generation-2".to_owned()),
    ]);

    harness
        .generator
        .start(
            MEETING.to_owned(),
            GenerationMode::Alternative,
            None,
            harness.sender.clone(),
        )
        .await?;

    let mut seen = Vec::new();

    loop {
        let event = next(&mut harness.events).await;
        let finished = matches!(event, GenerationEvent::Finished { .. });

        seen.push(event);

        if finished {
            break;
        }
    }

    assert!(
        !seen.contains(&GenerationEvent::Delta {
            text: "відповідь".to_owned()
        }),
        "the cancelled answer kept writing: {seen:?}"
    );
    assert!(seen.contains(&GenerationEvent::Delta {
        text: "нова".to_owned()
    }));

    Ok(())
}

#[tokio::test]
async fn cancelling_leaves_the_channel_quiet() -> Result<()> {
    let mut harness = harness(Arc::new(FakeAccess::allowed()));

    harness.backend.pace_answer(Duration::from_millis(80));
    harness.backend.answer_with(vec![
        Answer::Text("почато".to_owned()),
        Answer::Done("generation-1".to_owned()),
    ]);

    harness
        .generator
        .start(
            MEETING.to_owned(),
            GenerationMode::Reply,
            None,
            harness.sender.clone(),
        )
        .await?;

    next(&mut harness.events).await;
    harness.generator.cancel();

    assert!(
        timeout(Duration::from_millis(300), harness.events.recv())
            .await
            .is_err(),
        "a cancelled answer must go quiet"
    );

    Ok(())
}

#[tokio::test]
async fn a_denied_account_never_reaches_the_backend() {
    let mut harness = harness(Arc::new(FakeAccess::denied(DenialReason::NoSubscription)));

    let refused = harness
        .generator
        .start(
            MEETING.to_owned(),
            GenerationMode::Reply,
            None,
            harness.sender.clone(),
        )
        .await;

    assert!(matches!(refused, Err(Error::Access(_))));
    assert!(harness.backend.modes_asked().is_empty());
}

#[tokio::test]
async fn a_screenshot_travels_with_the_question() -> Result<()> {
    let mut harness = harness(Arc::new(FakeAccess::allowed()));

    harness
        .backend
        .answer_with(vec![Answer::Done("generation-1".to_owned())]);

    let picture = Screenshot {
        mime_type: "image/jpeg".to_owned(),
        bytes: vec![1, 2, 3],
    };

    harness
        .generator
        .start(
            MEETING.to_owned(),
            GenerationMode::Reply,
            Some(picture.clone()),
            harness.sender.clone(),
        )
        .await?;

    assert_eq!(
        next(&mut harness.events).await,
        GenerationEvent::Started {
            mode: GenerationMode::Reply,
            with_screenshot: true
        }
    );

    next(&mut harness.events).await;

    assert_eq!(harness.backend.pictures_asked(), vec![Some(picture)]);

    Ok(())
}
