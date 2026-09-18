use tokio::sync::mpsc::Sender;

use crate::{audio::frame::AudioFrame, error::Result};

pub trait AudioSource: Send {
    fn start(&mut self, sink: Sender<AudioFrame>) -> Result<()>;
    fn stop(&mut self) -> Result<()>;
}
