use std::{ffi::c_void, ptr::NonNull};

use objc2_core_audio::{
    kAudioDevicePropertyStreams, kAudioDevicePropertyTransportType,
    kAudioHardwarePropertyDefaultInputDevice, kAudioHardwarePropertyDevices,
    kAudioObjectPropertyElementMain, kAudioObjectPropertyName, kAudioObjectPropertyScopeGlobal,
    kAudioObjectPropertyScopeInput, kAudioObjectSystemObject, AudioObjectGetPropertyData,
    AudioObjectGetPropertyDataSize, AudioObjectID, AudioObjectPropertyAddress,
    AudioObjectPropertySelector,
};
use objc2_core_foundation::{CFRetained, CFString};

const OK: i32 = 0;

fn address(selector: AudioObjectPropertySelector, scope: u32) -> AudioObjectPropertyAddress {
    AudioObjectPropertyAddress {
        mSelector: selector,
        mScope: scope,
        mElement: kAudioObjectPropertyElementMain,
    }
}

fn property_size(object: AudioObjectID, mut address: AudioObjectPropertyAddress) -> Option<u32> {
    let mut size = 0_u32;

    let status = unsafe {
        AudioObjectGetPropertyDataSize(
            object,
            NonNull::from(&mut address),
            0,
            std::ptr::null(),
            NonNull::from(&mut size),
        )
    };

    (status == OK).then_some(size)
}

fn read<T: Copy + Default>(
    object: AudioObjectID,
    mut address: AudioObjectPropertyAddress,
) -> Option<T> {
    let mut value = T::default();
    let mut size = size_of::<T>() as u32;

    let status = unsafe {
        AudioObjectGetPropertyData(
            object,
            NonNull::from(&mut address),
            0,
            std::ptr::null(),
            NonNull::from(&mut size),
            NonNull::from(&mut value).cast::<c_void>(),
        )
    };

    (status == OK).then_some(value)
}

pub fn all_devices() -> Vec<AudioObjectID> {
    let address = address(
        kAudioHardwarePropertyDevices,
        kAudioObjectPropertyScopeGlobal,
    );
    let object = kAudioObjectSystemObject as AudioObjectID;

    let Some(size) = property_size(object, address) else {
        return Vec::new();
    };

    let count = size as usize / size_of::<AudioObjectID>();
    let mut devices = vec![0 as AudioObjectID; count];
    let mut bytes = size;
    let mut address = address;

    let Some(buffer) = NonNull::new(devices.as_mut_ptr().cast::<c_void>()) else {
        return Vec::new();
    };

    let status = unsafe {
        AudioObjectGetPropertyData(
            object,
            NonNull::from(&mut address),
            0,
            std::ptr::null(),
            NonNull::from(&mut bytes),
            buffer,
        )
    };

    if status != OK {
        return Vec::new();
    }

    devices
}

pub fn default_input() -> Option<AudioObjectID> {
    read::<AudioObjectID>(
        kAudioObjectSystemObject as AudioObjectID,
        address(
            kAudioHardwarePropertyDefaultInputDevice,
            kAudioObjectPropertyScopeGlobal,
        ),
    )
}

pub fn has_input(device: AudioObjectID) -> bool {
    property_size(
        device,
        address(kAudioDevicePropertyStreams, kAudioObjectPropertyScopeInput),
    )
    .is_some_and(|size| size > 0)
}

pub fn transport(device: AudioObjectID) -> Option<u32> {
    read::<u32>(
        device,
        address(
            kAudioDevicePropertyTransportType,
            kAudioObjectPropertyScopeGlobal,
        ),
    )
}

pub fn name(device: AudioObjectID) -> Option<String> {
    let raw = read::<*const CFString>(
        device,
        address(kAudioObjectPropertyName, kAudioObjectPropertyScopeGlobal),
    )?;

    let text = unsafe { CFRetained::from_raw(NonNull::new(raw.cast_mut())?) };

    Some(text.to_string())
}
