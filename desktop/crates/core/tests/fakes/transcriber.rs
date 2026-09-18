use std::{
    collections::HashMap,
    sync::{Arc, Mutex},
};

use async_trait::async_trait;
use meet_copilot_core::{
    audio::{AudioFrame, SAMPLES_PER_FRAME},
    backend::{SttEvent, SttEvents, SttGateway, SttLane, SttSink},
    domain::{MeetingId, Speaker},
    error::Result,
};
use tokio::sync::mpsc;

const FRAME_CHANNEL_CAPACITY: usize = 32;
const MILLISECONDS_PER_SAMPLE: f64 = 1.0 / 16.0;

#[derive(Debug, Default, Clone, Copy, PartialEq, Eq)]
pub struct Heard {
    pub samples: usize,
    pub frames: usize,
    pub oversized_frames: usize,
}

/// Stands in for the backend's speech lane: it counts what actually reached
/// the wire and answers with one transcript segment per lane on close.
#[derive(Default)]
pub struct TranscribingGateway {
    heard: Arc<Mutex<HashMap<Speaker, Heard>>>,
}

impl TranscribingGateway {
    pub fn heard(&self, speaker: Speaker) -> Heard {
        self.heard
            .lock()
            .expect("lock")
            .get(&speaker)
            .copied()
            .unwrap_or_default()
    }
}

#[async_trait]
impl SttGateway for TranscribingGateway {
    async fn open(&self, _meeting_id: &MeetingId, speaker: Speaker) -> Result<SttLane> {
        let (events, incoming) = mpsc::channel(FRAME_CHANNEL_CAPACITY);

        Ok((
            Box::new(CountingSink {
                speaker,
                heard: Arc::clone(&self.heard),
                events: Some(events),
            }),
            Box::new(QueuedEvents(incoming)),
        ))
    }
}

struct CountingSink {
    speaker: Speaker,
    heard: Arc<Mutex<HashMap<Speaker, Heard>>>,
    events: Option<mpsc::Sender<SttEvent>>,
}

#[async_trait]
impl SttSink for CountingSink {
    async fn send(&mut self, frame: &AudioFrame) -> Result<()> {
        let mut heard = self.heard.lock().expect("lock");
        let entry = heard.entry(self.speaker).or_default();

        entry.samples += frame.samples.len();
        entry.frames += 1;

        if frame.samples.is_empty() || frame.samples.len() > SAMPLES_PER_FRAME {
            entry.oversized_frames += 1;
        }

        Ok(())
    }

    async fn close(&mut self) -> Result<()> {
        let Some(events) = self.events.take() else {
            return Ok(());
        };

        let samples = self
            .heard
            .lock()
            .expect("lock")
            .entry(self.speaker)
            .or_default()
            .samples;

        let _ = events
            .send(SttEvent::Final {
                id: format!("segment-{}", self.speaker.as_query_value()),
                speaker: self.speaker,
                text: format!("{samples} samples"),
                start_ms: 0,
                duration_ms: (samples as f64 * MILLISECONDS_PER_SAMPLE) as u64,
            })
            .await;

        Ok(())
    }
}

struct QueuedEvents(mpsc::Receiver<SttEvent>);

#[async_trait]
impl SttEvents for QueuedEvents {
    async fn next(&mut self) -> Option<SttEvent> {
        self.0.recv().await
    }
}
