use std::path::Path;

use tracing_appender::{
    non_blocking::WorkerGuard,
    rolling::{Builder, RollingFileAppender, Rotation},
};
use tracing_subscriber::{fmt, layer::SubscriberExt, util::SubscriberInitExt, EnvFilter};

const DEFAULT_FILTER: &str = "info";
const FILE_PREFIX: &str = "meet-copilot";
const FILE_SUFFIX: &str = "log";
const KEPT_FILES: usize = 7;

pub fn start(directory: &Path) -> Option<WorkerGuard> {
    let console = fmt::layer().with_writer(std::io::stderr);
    let base = tracing_subscriber::registry().with(filter()).with(console);

    let Some(file) = open(directory) else {
        base.init();
        tracing::warn!("logs are not being written to {}", directory.display());
        return None;
    };

    let (writer, guard) = tracing_appender::non_blocking(file);
    base.with(fmt::layer().with_ansi(false).with_writer(writer))
        .init();

    Some(guard)
}

fn filter() -> EnvFilter {
    EnvFilter::try_from_default_env().unwrap_or_else(|_| EnvFilter::new(DEFAULT_FILTER))
}

fn open(directory: &Path) -> Option<RollingFileAppender> {
    Builder::new()
        .rotation(Rotation::DAILY)
        .filename_prefix(FILE_PREFIX)
        .filename_suffix(FILE_SUFFIX)
        .max_log_files(KEPT_FILES)
        .build(directory)
        .ok()
}
