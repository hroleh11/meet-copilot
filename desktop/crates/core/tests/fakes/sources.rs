use std::sync::{
    atomic::{AtomicBool, AtomicUsize, Ordering},
    Arc,
};

use cueline_core::{
    audio::{AudioFrame, AudioSource},
    error::{Error, Result},
    session::AudioSources,
};
use tokio::sync::mpsc::Sender;

#[derive(Default)]
pub struct FakeSources {
    started: Arc<AtomicUsize>,
    stopped: Arc<AtomicUsize>,
    microphone_fails: AtomicBool,
    has_system_audio: OnceTrue,
}

struct OnceTrue(AtomicBool);

impl Default for OnceTrue {
    fn default() -> Self {
        Self(AtomicBool::new(true))
    }
}

impl FakeSources {
    pub fn started(&self) -> usize {
        self.started.load(Ordering::SeqCst)
    }

    pub fn stopped(&self) -> usize {
        self.stopped.load(Ordering::SeqCst)
    }

    pub fn fail_microphone(&self) {
        self.microphone_fails.store(true, Ordering::SeqCst);
    }

    pub fn without_system_audio(&self) {
        self.has_system_audio.0.store(false, Ordering::SeqCst);
    }
}

impl AudioSources for FakeSources {
    fn microphone(&self, _device_id: Option<String>) -> Box<dyn AudioSource> {
        Box::new(FakeSource {
            fails: self.microphone_fails.load(Ordering::SeqCst),
            failure: "The microphone could not be opened",
            started: Arc::clone(&self.started),
            stopped: Arc::clone(&self.stopped),
            frames: None,
        })
    }

    fn system_audio(&self) -> Option<Box<dyn AudioSource>> {
        if !self.has_system_audio.0.load(Ordering::SeqCst) {
            return None;
        }

        Some(Box::new(FakeSource {
            fails: false,
            failure: "The far side could not be opened",
            started: Arc::clone(&self.started),
            stopped: Arc::clone(&self.stopped),
            frames: None,
        }))
    }
}

struct FakeSource {
    fails: bool,
    failure: &'static str,
    started: Arc<AtomicUsize>,
    stopped: Arc<AtomicUsize>,
    frames: Option<Sender<AudioFrame>>,
}

impl AudioSource for FakeSource {
    fn start(&mut self, sink: Sender<AudioFrame>) -> Result<()> {
        if self.fails {
            return Err(Error::Audio(self.failure.to_owned()));
        }

        self.started.fetch_add(1, Ordering::SeqCst);
        self.frames = Some(sink);

        Ok(())
    }

    fn stop(&mut self) -> Result<()> {
        self.stopped.fetch_add(1, Ordering::SeqCst);
        self.frames = None;

        Ok(())
    }
}
