import { useEffect, useState } from 'react';
import { uk } from '~/shared/i18n/uk';
import type { MeetingDetails } from '~/shared/ipc';
import { getMeeting } from '~/shared/ipc/commands';
import { errorMessage } from '~/shared/lib/command-error';

interface UseMeetingResult {
  details: MeetingDetails | null;
  loading: boolean;
  error: string | null;
}

interface Loaded {
  meetingId: string;
  details: MeetingDetails | null;
  error: string | null;
}

/// What is on screen is tied to the meeting it was loaded for, so opening another
/// one reads as loading until its own answer arrives.
export function useMeeting(meetingId: string): UseMeetingResult {
  const [loaded, setLoaded] = useState<Loaded>({ meetingId, details: null, error: null });

  useEffect(() => {
    let wanted = true;

    getMeeting(meetingId)
      .then((details) => {
        if (wanted) {
          setLoaded({ meetingId, details, error: null });
        }
      })
      .catch((cause: unknown) => {
        if (wanted) {
          setLoaded({
            meetingId,
            details: null,
            error: errorMessage(cause, uk.errors.history),
          });
        }
      });

    return () => {
      wanted = false;
    };
  }, [meetingId]);

  const fresh = loaded.meetingId === meetingId;

  return {
    details: fresh ? loaded.details : null,
    loading: !fresh || (loaded.details === null && loaded.error === null),
    error: fresh ? loaded.error : null,
  };
}
