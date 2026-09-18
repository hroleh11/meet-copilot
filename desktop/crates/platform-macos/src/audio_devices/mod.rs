mod core_audio;

use objc2_core_audio::{
    kAudioDeviceTransportTypeBluetooth, kAudioDeviceTransportTypeBluetoothLE,
    kAudioDeviceTransportTypeBuiltIn,
};

/// A Bluetooth headset drops from stereo playback to the 16 kHz call profile the
/// moment anything opens its microphone, so the meeting the user is listening to
/// suddenly sounds like a phone call. Knowing which inputs are Bluetooth lets the
/// app pick another microphone and say why.
pub fn is_bluetooth_input(name: &str) -> bool {
    inputs()
        .into_iter()
        .any(|input| input.name == name && input.bluetooth)
}

pub fn default_input_is_bluetooth() -> bool {
    let Some(default) = core_audio::default_input() else {
        return false;
    };

    core_audio::transport(default).is_some_and(is_bluetooth)
}

pub fn built_in_input_name() -> Option<String> {
    inputs()
        .into_iter()
        .find(|input| input.built_in)
        .map(|input| input.name)
}

struct Input {
    name: String,
    bluetooth: bool,
    built_in: bool,
}

fn inputs() -> Vec<Input> {
    core_audio::all_devices()
        .into_iter()
        .filter(|device| core_audio::has_input(*device))
        .filter_map(|device| {
            let transport = core_audio::transport(device)?;

            Some(Input {
                name: core_audio::name(device)?,
                bluetooth: is_bluetooth(transport),
                built_in: transport == kAudioDeviceTransportTypeBuiltIn,
            })
        })
        .collect()
}

fn is_bluetooth(transport: u32) -> bool {
    transport == kAudioDeviceTransportTypeBluetooth
        || transport == kAudioDeviceTransportTypeBluetoothLE
}
