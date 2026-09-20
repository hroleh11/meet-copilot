use cueline_core::audio::list_input_devices;

/// Opening a Bluetooth headset's microphone forces the headset into the call
/// profile, and the meeting the user is listening to drops to phone quality. When
/// nothing was chosen by hand, prefer the built-in microphone so the headset stays
/// in stereo playback.
#[cfg(target_os = "macos")]
pub fn resolve(device_id: Option<String>) -> Option<String> {
    use cueline_platform_macos::audio_devices;

    if device_id.is_some() {
        return device_id;
    }

    if !audio_devices::default_input_is_bluetooth() {
        return None;
    }

    let built_in = audio_devices::built_in_input_name()?;
    let id = device_id_by_name(&built_in);

    if id.is_some() {
        tracing::info!("using {built_in} so the Bluetooth headset keeps playing in stereo");
    }

    id
}

#[cfg(not(target_os = "macos"))]
pub fn resolve(device_id: Option<String>) -> Option<String> {
    device_id
}

#[cfg(target_os = "macos")]
fn device_id_by_name(name: &str) -> Option<String> {
    list_input_devices()
        .ok()?
        .into_iter()
        .find(|device| device.name == name)
        .map(|device| device.id)
}

pub fn bluetooth_names() -> Vec<String> {
    #[cfg(target_os = "macos")]
    {
        list_input_devices()
            .unwrap_or_default()
            .into_iter()
            .filter(|device| {
                cueline_platform_macos::audio_devices::is_bluetooth_input(&device.name)
            })
            .map(|device| device.name)
            .collect()
    }

    #[cfg(not(target_os = "macos"))]
    Vec::new()
}
