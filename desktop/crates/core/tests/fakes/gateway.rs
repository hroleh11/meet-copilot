use std::{
    collections::HashMap,
    sync::{
        atomic::{AtomicBool, Ordering},
        Arc, Mutex,
    },
    time::Duration,
};

use async_trait::async_trait;
use meet_copilot_core::{
    audio::AudioFrame,
    backend::{SttEvent, SttEvents, SttGateway, SttLane, SttSink},
    domain::{MeetingId, Speaker},
    error::Result,
};
use tokio::{
    sync::broadcast,
    time::{sleep, Instant},
};

struct Opened {
    meeting_id: MeetingId,
    speaker: Speaker,
}

pub struct FakeGateway {
    opened: Mutex<Vec<Opened>>,
    events: broadcast::Sender<SttEvent>,
    drops: Arc<Mutex<u64>>,
    tails: Mutex<HashMap<Speaker, SttEvent>>,
}

impl Default for FakeGateway {
    fn default() -> Self {
        Self {
            opened: Mutex::new(Vec::new()),
            events: broadcast::channel(64).0,
            drops: Arc::new(Mutex::new(0)),
            tails: Mutex::new(HashMap::new()),
        }
    }
}

impl FakeGateway {
    pub fn opened_speakers(&self) -> Vec<Speaker> {
        let mut speakers: Vec<Speaker> = self
            .opened
            .lock()
            .expect("lock")
            .iter()
            .map(|opened| opened.speaker)
            .collect();
        speakers.sort_by_key(|speaker| match speaker {
            Speaker::Me => 0,
            Speaker::Other => 1,
        });
        speakers.dedup();
        speakers
    }

    pub fn meetings_opened(&self) -> Vec<MeetingId> {
        self.opened
            .lock()
            .expect("lock")
            .iter()
            .map(|opened| opened.meeting_id.clone())
            .collect()
    }

    pub fn emit(&self, event: SttEvent) {
        let _ = self.events.send(event);
    }

    /// The backend only flushes the last utterance once the lane asks to
    /// finish, so the tail arrives after the sink was closed.
    pub fn set_tail(&self, speaker: Speaker, event: SttEvent) {
        self.tails.lock().expect("lock").insert(speaker, event);
    }

    /// Ends every open lane, which is what a dropped socket looks like to the
    /// session.
    pub fn drop_lanes(&self) {
        *self.drops.lock().expect("lock") += 1;
    }

    pub async fn wait_for_lanes(&self, count: usize) {
        let deadline = Instant::now() + Duration::from_secs(5);

        while Instant::now() < deadline {
            if self.opened.lock().expect("lock").len() >= count {
                return;
            }

            sleep(Duration::from_millis(10)).await;
        }

        panic!(
            "expected {count} lanes, saw {}",
            self.opened.lock().expect("lock").len()
        );
    }
}

#[async_trait]
impl SttGateway for FakeGateway {
    async fn open(&self, meeting_id: &MeetingId, speaker: Speaker) -> Result<SttLane> {
        self.opened.lock().expect("lock").push(Opened {
            meeting_id: meeting_id.clone(),
            speaker,
        });

        let finished = Arc::new(AtomicBool::new(false));

        Ok((
            Box::new(FakeSink {
                tail: self.tails.lock().expect("lock").get(&speaker).cloned(),
                events: self.events.clone(),
                finished: Arc::clone(&finished),
            }),
            Box::new(FakeEvents {
                speaker,
                events: self.events.subscribe(),
                drops: Arc::clone(&self.drops),
                seen_drops: *self.drops.lock().expect("lock"),
                finished,
            }),
        ))
    }
}

struct FakeSink {
    tail: Option<SttEvent>,
    events: broadcast::Sender<SttEvent>,
    finished: Arc<AtomicBool>,
}

#[async_trait]
impl SttSink for FakeSink {
    async fn send(&mut self, _frame: &AudioFrame) -> Result<()> {
        Ok(())
    }

    async fn close(&mut self) -> Result<()> {
        if let Some(tail) = self.tail.take() {
            let _ = self.events.send(tail);
        }

        self.finished.store(true, Ordering::SeqCst);

        Ok(())
    }
}

struct FakeEvents {
    speaker: Speaker,
    events: broadcast::Receiver<SttEvent>,
    drops: Arc<Mutex<u64>>,
    seen_drops: u64,
    finished: Arc<AtomicBool>,
}

#[async_trait]
impl SttEvents for FakeEvents {
    async fn next(&mut self) -> Option<SttEvent> {
        loop {
            if *self.drops.lock().expect("lock") != self.seen_drops {
                return None;
            }

            match tokio::time::timeout(Duration::from_millis(10), self.events.recv()).await {
                Ok(Ok(event)) if speaker_of(&event) == Some(self.speaker) => return Some(event),
                Ok(Ok(_)) => continue,
                Ok(Err(_)) => return None,
                Err(_) if self.finished.load(Ordering::SeqCst) => return None,
                Err(_) => continue,
            }
        }
    }
}

fn speaker_of(event: &SttEvent) -> Option<Speaker> {
    match event {
        SttEvent::Partial { speaker, .. } | SttEvent::Final { speaker, .. } => Some(*speaker),
        SttEvent::Failed { .. } => None,
    }
}
