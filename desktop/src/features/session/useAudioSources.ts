import { useCallback, useEffect, useState } from 'react';
import type { AudioPermission } from '~/shared/ipc';
import {
  listAudioDevices,
  openAudioPermission,
  systemAudioAllowed,
} from '~/shared/ipc/commands';
import { useSessionStore } from '~/shared/store/sessionStore';
import type { SourceAvailability } from './AudioSourceStatus';

interface UseAudioSourcesResult {
  microphone: SourceAvailability;
  systemAudio: SourceAvailability;
  openPermission: (permission: AudioPermission) => void;
}

export function useAudioSources(): UseAudioSourcesResult {
  const sources = useSessionStore((store) => store.sources);
  const [devices, setDevices] = useState<SourceAvailability>('unchecked');
  const [screenRecording, setScreenRecording] = useState<SourceAvailability>('unchecked');

  useEffect(() => {
    listAudioDevices()
      .then((found) => {
        setDevices(found.length > 0 ? 'connected' : 'missing');
      })
      .catch(() => {
        setDevices('missing');
      });
  }, []);

  useEffect(() => {
    systemAudioAllowed()
      .then((allowed) => {
        setScreenRecording(allowed ? 'connected' : 'missing');
      })
      .catch(() => {
        setScreenRecording('unchecked');
      });
  }, []);

  const openPermission = useCallback((permission: AudioPermission) => {
    void openAudioPermission(permission);
  }, []);

  const live = (speaker: 'me' | 'other'): SourceAvailability | null => {
    const status = sources.find((source) => source.speaker === speaker);

    if (!status) {
      return null;
    }

    return status.active ? 'connected' : 'missing';
  };

  return {
    microphone: live('me') ?? devices,
    systemAudio: live('other') ?? screenRecording,
    openPermission,
  };
}
