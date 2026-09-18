import { listen } from '@tauri-apps/api/event';
import { useCallback, useEffect, useRef, useState } from 'react';
import { uk } from '~/shared/i18n/uk';
import type { AudioDevice, AudioLevelEvent, Speaker } from '~/shared/ipc';
import { listAudioDevices, startAudioCheck, stopAudioCheck } from '~/shared/ipc/commands';
import { APP_EVENT } from '~/shared/ipc/events';
import { errorMessage } from '~/shared/lib/command-error';

type Levels = Record<Speaker, number>;

const SILENT: Levels = { me: 0, other: 0 };

interface UseAudioCheckResult {
  devices: AudioDevice[];
  running: boolean;
  levels: Levels;
  systemAudioProblem: string | null;
  error: string | null;
  toggle: (deviceId: string | null) => void;
}

export function useAudioCheck(): UseAudioCheckResult {
  const [devices, setDevices] = useState<AudioDevice[]>([]);
  const [running, setRunning] = useState(false);
  const [levels, setLevels] = useState<Levels>(SILENT);
  const [systemAudioProblem, setSystemAudioProblem] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const runningRef = useRef(false);

  useEffect(() => {
    listAudioDevices()
      .then(setDevices)
      .catch((cause: unknown) => {
        setError(errorMessage(cause, uk.errors.microphone));
      });
  }, []);

  useEffect(() => {
    if (!running) {
      return;
    }

    const subscription = listen<AudioLevelEvent>(APP_EVENT.audioLevel, (event) => {
      setLevels((current) => ({
        ...current,
        [event.payload.speaker]: event.payload.level,
      }));
    });

    return () => {
      void subscription.then((unsubscribe) => {
        unsubscribe();
      });
    };
  }, [running]);

  useEffect(
    () => () => {
      if (runningRef.current) {
        void stopAudioCheck();
      }
    },
    [],
  );

  const toggle = useCallback(
    (deviceId: string | null) => {
      setError(null);

      if (running) {
        stopAudioCheck()
          .then(() => {
            runningRef.current = false;
            setRunning(false);
            setLevels(SILENT);
          })
          .catch((cause: unknown) => {
            setError(errorMessage(cause, uk.errors.microphone));
          });
        return;
      }

      startAudioCheck(deviceId)
        .then((status) => {
          runningRef.current = true;
          setSystemAudioProblem(status.systemAudioProblem);
          setRunning(true);
        })
        .catch((cause: unknown) => {
          setError(errorMessage(cause, uk.errors.microphone));
        });
    },
    [running],
  );

  return { devices, running, levels, systemAudioProblem, error, toggle };
}
