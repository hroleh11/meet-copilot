use std::{sync::Arc, time::Duration};

use tokio::{
    sync::{
        mpsc::{Receiver, Sender},
        oneshot,
    },
    time::{sleep, timeout},
};
use tokio_util::sync::CancellationToken;

use crate::{
    audio::AudioFrame,
    backend::{SttEvent, SttEvents, SttGateway, SttSink},
    backend_failure::BackendFailure,
    domain::{MeetingId, Speaker},
    error::Error,
};

const RECONNECT_ATTEMPTS: u32 = 5;
const RECONNECT_BASE_DELAY: Duration = Duration::from_millis(500);
const DRAIN_TIMEOUT: Duration = Duration::from_secs(5);

pub struct Lane {
    pub speaker: Speaker,
    pub meeting_id: MeetingId,
    pub gateway: Arc<dyn SttGateway>,
    pub frames: Receiver<AudioFrame>,
    pub events: Sender<SttEvent>,
    pub cancel: CancellationToken,
}

/// Keeps one speaker's audio flowing to the backend, reopening the socket when
/// it drops. A reconnect keeps the meeting, so only the audio recorded while
/// the socket was down is lost. Closing waits for the backend to flush the
/// last utterance, which it only sends after the close request.
pub async fn run(mut lane: Lane) {
    let mut attempt = 0;

    while !lane.cancel.is_cancelled() {
        let opened = lane.gateway.open(&lane.meeting_id, lane.speaker).await;

        let (sink, events) = match opened {
            Ok(lane) => lane,
            Err(error) => {
                if !should_retry(&error) || attempt >= RECONNECT_ATTEMPTS {
                    report(&lane.events, error).await;
                    return;
                }

                attempt += 1;
                backoff(attempt, &lane.cancel).await;
                continue;
            }
        };

        attempt = 0;

        match pump(&mut lane, sink, events).await {
            Outcome::Finished => return,
            Outcome::SourceGone => {
                report(
                    &lane.events,
                    Error::Audio(format!(
                        "The {} audio stopped arriving",
                        describe(lane.speaker)
                    )),
                )
                .await;
                return;
            }
            Outcome::Dropped => continue,
        }
    }
}

#[derive(Debug, PartialEq, Eq)]
enum Outcome {
    Finished,
    Dropped,
    SourceGone,
}

async fn pump(
    lane: &mut Lane,
    mut sink: Box<dyn SttSink>,
    mut events: Box<dyn SttEvents>,
) -> Outcome {
    let transcript = lane.events.clone();
    let (ended, mut reader_ended) = oneshot::channel();

    let mut reader = tokio::spawn(async move {
        while let Some(event) = events.next().await {
            if transcript.send(event).await.is_err() {
                break;
            }
        }

        let _ = ended.send(());
    });

    let outcome = loop {
        let frame = tokio::select! {
            _ = lane.cancel.cancelled() => break Outcome::Finished,
            _ = &mut reader_ended => break Outcome::Dropped,
            frame = lane.frames.recv() => frame,
        };

        let Some(frame) = frame else {
            break Outcome::SourceGone;
        };

        if sink.send(&frame).await.is_err() {
            break Outcome::Dropped;
        }
    };

    let _ = sink.close().await;

    if timeout(DRAIN_TIMEOUT, &mut reader).await.is_err() {
        reader.abort();
    }

    outcome
}

fn should_retry(error: &Error) -> bool {
    error
        .backend_failure()
        .is_some_and(BackendFailure::is_retryable)
}

async fn backoff(attempt: u32, cancel: &CancellationToken) {
    let delay = RECONNECT_BASE_DELAY * 2_u32.saturating_pow(attempt - 1);

    tokio::select! {
        _ = cancel.cancelled() => {},
        _ = sleep(delay) => {},
    }
}

fn describe(speaker: Speaker) -> &'static str {
    match speaker {
        Speaker::Me => "microphone",
        Speaker::Other => "meeting",
    }
}

async fn report(events: &Sender<SttEvent>, error: Error) {
    let _ = events
        .send(SttEvent::Failed {
            message: error.to_string(),
        })
        .await;
}
