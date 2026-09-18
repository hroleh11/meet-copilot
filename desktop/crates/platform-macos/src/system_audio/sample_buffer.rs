use std::{ptr, ptr::NonNull, slice};

use meet_copilot_core::audio::downmix_to_mono;
use objc2_core_audio_types::{AudioBuffer, AudioBufferList};
use objc2_core_foundation::CFRetained;
use objc2_core_media::{CMBlockBuffer, CMSampleBuffer};

/// Pulls the PCM out of one ScreenCaptureKit audio sample buffer and folds it
/// down to mono. ScreenCaptureKit hands over planar f32, one buffer per
/// channel, but an interleaved layout is handled too.
pub fn mono_samples(sample_buffer: &CMSampleBuffer) -> Option<Vec<f32>> {
    let mut needed: usize = 0;

    let status = unsafe {
        sample_buffer.audio_buffer_list_with_retained_block_buffer(
            &mut needed,
            ptr::null_mut(),
            0,
            None,
            None,
            0,
            ptr::null_mut(),
        )
    };

    if status != 0 || needed == 0 {
        return None;
    }

    let mut storage = vec![0_u64; needed.div_ceil(size_of::<u64>())];
    let list = storage.as_mut_ptr().cast::<AudioBufferList>();
    let mut block_buffer: *mut CMBlockBuffer = ptr::null_mut();

    let status = unsafe {
        sample_buffer.audio_buffer_list_with_retained_block_buffer(
            ptr::null_mut(),
            list,
            needed,
            None,
            None,
            0,
            &mut block_buffer,
        )
    };

    let _owned = NonNull::new(block_buffer).map(|buffer| unsafe { CFRetained::from_raw(buffer) });

    if status != 0 {
        return None;
    }

    unsafe { fold_to_mono(list) }
}

unsafe fn fold_to_mono(list: *const AudioBufferList) -> Option<Vec<f32>> {
    let count = unsafe { (*list).mNumberBuffers } as usize;

    if count == 0 {
        return None;
    }

    let buffers = unsafe { ptr::addr_of!((*list).mBuffers) }.cast::<AudioBuffer>();

    if count == 1 {
        let buffer = unsafe { &*buffers };

        return Some(downmix_to_mono(
            unsafe { samples_of(buffer) },
            buffer.mNumberChannels as u16,
        ));
    }

    let planes: Vec<&[f32]> = (0..count)
        .map(|index| unsafe { samples_of(&*buffers.add(index)) })
        .collect();
    let frames = planes.iter().map(|plane| plane.len()).min()?;

    Some(
        (0..frames)
            .map(|frame| {
                planes
                    .iter()
                    .filter_map(|plane| plane.get(frame))
                    .sum::<f32>()
                    / count as f32
            })
            .collect(),
    )
}

unsafe fn samples_of<'a>(buffer: &AudioBuffer) -> &'a [f32] {
    if buffer.mData.is_null() {
        return &[];
    }

    unsafe {
        slice::from_raw_parts(
            buffer.mData.cast::<f32>(),
            buffer.mDataByteSize as usize / size_of::<f32>(),
        )
    }
}
