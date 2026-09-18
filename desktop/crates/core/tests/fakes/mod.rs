#![allow(dead_code, unused_imports)]

mod access;
mod backend;
mod gateway;
mod recorded;
mod secrets;
mod sources;
mod transcriber;

pub use access::FakeAccess;
pub use backend::{Answer, FakeBackend};
pub use gateway::FakeGateway;
pub use recorded::{recorded_clip, RecordedSources};
pub use secrets::EmptySecrets;
pub use sources::FakeSources;
pub use transcriber::{Heard, TranscribingGateway};
