import { useEffect, useState } from 'react';
import { listAudioDevices } from '~/shared/ipc/commands';
import { useSessionStore } from '~/shared/store/sessionStore';
import type { SourceAvailability } from './AudioSourceStatus';

interface UseAudioSourcesResult {
  microphone: SourceAvailability;
  systemAudio: SourceAvailability;
}

export function useAudioSources(): UseAudioSourcesResult {
  const sources = useSessionStore((store) => store.sources);
  const [devices, setDevices] = useState<SourceAvailability>('unchecked');

  useEffect(() => {
    listAudioDevices()
      .then((found) => {
        setDevices(found.length > 0 ? 'connected' : 'missing');
      })
      .catch(() => {
        setDevices('missing');
      });
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
    systemAudio: live('other') ?? 'unchecked',
  };
}
