import { listen } from '@tauri-apps/api/event';
import { useCallback, useEffect, useRef, useState } from 'react';
import { uk } from '~/shared/i18n/uk';
import type { AudioDevice } from '~/shared/ipc';
import { APP_EVENT } from '~/shared/ipc/events';
import {
  listAudioDevices,
  startMicrophoneTest,
  stopMicrophoneTest,
} from '~/shared/ipc/commands';
import { errorMessage } from '~/shared/lib/command-error';

interface UseMicrophoneTestResult {
  devices: AudioDevice[];
  testing: boolean;
  level: number;
  error: string | null;
  toggle: (deviceId: string | null) => void;
}

export function useMicrophoneTest(): UseMicrophoneTestResult {
  const [devices, setDevices] = useState<AudioDevice[]>([]);
  const [testing, setTesting] = useState(false);
  const [level, setLevel] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const testingRef = useRef(false);

  useEffect(() => {
    listAudioDevices()
      .then(setDevices)
      .catch((cause: unknown) => {
        setError(errorMessage(cause, uk.errors.microphone));
      });
  }, []);

  useEffect(() => {
    if (!testing) {
      return;
    }

    const subscription = listen<{ level: number }>(APP_EVENT.audioLevel, (event) => {
      setLevel(event.payload.level);
    });

    return () => {
      void subscription.then((unsubscribe) => {
        unsubscribe();
      });
    };
  }, [testing]);

  useEffect(
    () => () => {
      if (testingRef.current) {
        void stopMicrophoneTest();
      }
    },
    [],
  );

  const toggle = useCallback(
    (deviceId: string | null) => {
      setError(null);

      if (testing) {
        stopMicrophoneTest()
          .then(() => {
            testingRef.current = false;
            setTesting(false);
            setLevel(0);
          })
          .catch((cause: unknown) => {
            setError(errorMessage(cause, uk.errors.microphone));
          });
        return;
      }

      startMicrophoneTest(deviceId)
        .then(() => {
          testingRef.current = true;
          setTesting(true);
        })
        .catch((cause: unknown) => {
          setError(errorMessage(cause, uk.errors.microphone));
        });
    },
    [testing],
  );

  return { devices, testing, level, error, toggle };
}
