use objc2::{
    define_class, msg_send,
    rc::{Allocated, Retained},
    AnyThread, DefinedClass,
};
use objc2_core_media::CMSampleBuffer;
use objc2_foundation::{NSError, NSObject, NSObjectProtocol};
use objc2_screen_capture_kit::{SCStream, SCStreamDelegate, SCStreamOutput, SCStreamOutputType};
use tokio::sync::mpsc::Sender;

use super::sample_buffer::mono_samples;

pub struct OutputState {
    samples: Sender<Vec<f32>>,
}

define_class!(
    #[unsafe(super(NSObject))]
    #[name = "CuelineSystemAudioOutput"]
    #[ivars = OutputState]
    pub struct SystemAudioOutput;

    impl SystemAudioOutput {}

    unsafe impl NSObjectProtocol for SystemAudioOutput {}

    unsafe impl SCStreamOutput for SystemAudioOutput {
        #[unsafe(method(stream:didOutputSampleBuffer:ofType:))]
        fn did_output_sample_buffer(
            &self,
            _stream: &SCStream,
            sample_buffer: &CMSampleBuffer,
            kind: SCStreamOutputType,
        ) {
            if kind != SCStreamOutputType::Audio {
                return;
            }

            if let Some(samples) = mono_samples(sample_buffer) {
                let _ = self.ivars().samples.try_send(samples);
            }
        }
    }

    unsafe impl SCStreamDelegate for SystemAudioOutput {
        #[unsafe(method(stream:didStopWithError:))]
        fn did_stop_with_error(&self, _stream: &SCStream, error: &NSError) {
            tracing::warn!("system audio stream stopped: {error}");
        }
    }
);

impl SystemAudioOutput {
    pub fn new(samples: Sender<Vec<f32>>) -> Retained<Self> {
        let this: Allocated<Self> = Self::alloc();
        let this = this.set_ivars(OutputState { samples });

        unsafe { msg_send![super(this), init] }
    }
}
