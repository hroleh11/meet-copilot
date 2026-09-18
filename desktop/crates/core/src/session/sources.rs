use crate::{audio::AudioSource, error::Result};

/// The composition root supplies the concrete capture devices, so core stays
/// free of any platform code while still owning the session lifecycle.
pub trait AudioSources: Send + Sync {
    fn microphone(&self, device_id: Option<String>) -> Box<dyn AudioSource>;

    /// `None` where capturing the other side is not supported yet.
    fn system_audio(&self) -> Option<Box<dyn AudioSource>>;
}

pub struct StartedSources {
    sources: Vec<Box<dyn AudioSource>>,
}

impl StartedSources {
    pub fn new(sources: Vec<Box<dyn AudioSource>>) -> Self {
        Self { sources }
    }

    pub fn stop(mut self) -> Result<()> {
        for source in &mut self.sources {
            source.stop()?;
        }

        Ok(())
    }
}
