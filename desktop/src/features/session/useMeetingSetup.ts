import { useCallback, useState } from 'react';
import type { Language, MeetingProfile, UserSettings } from '~/shared/ipc';
import { useResettableDraft } from '~/shared/lib/useResettableDraft';

interface UseMeetingSetupResult {
  profile: MeetingProfile;
  language: Language;
  replyLanguage: Language | null;
  projectId: string | null;
  setProfile: (profile: MeetingProfile) => void;
  setLanguage: (language: Language) => void;
  setReplyLanguage: (replyLanguage: Language | null) => void;
  setProjectId: (projectId: string | null) => void;
}

/// What the user picks before a meeting is what they want next time too, so the
/// choice goes into the user settings rather than living until the window is
/// rebuilt. The project is the exception: it belongs to this call, and it has to
/// be chosen before the start, because it decides which project materials the
/// assistant is given.
export function useMeetingSetup(
  defaults: UserSettings | null,
  onRemember: (settings: UserSettings) => void,
): UseMeetingSetupResult {
  const [profile, setProfile] = useResettableDraft<MeetingProfile>(
    defaults?.defaultProfile ?? 'daily',
  );
  const [language, setLanguage] = useResettableDraft<Language>(
    defaults?.defaultLanguage ?? 'uk',
  );
  const [projectId, setProjectId] = useState<string | null>(null);
  const [replyLanguage, setReplyLanguage] = useState<Language | null>(null);

  const rememberProfile = useCallback(
    (chosen: MeetingProfile) => {
      setProfile(chosen);

      if (defaults) {
        onRemember({ ...defaults, defaultProfile: chosen });
      }
    },
    [defaults, onRemember, setProfile],
  );

  const rememberLanguage = useCallback(
    (chosen: Language) => {
      setLanguage(chosen);

      if (defaults) {
        onRemember({ ...defaults, defaultLanguage: chosen });
      }
    },
    [defaults, onRemember, setLanguage],
  );

  return {
    profile,
    language,
    replyLanguage,
    projectId,
    setProfile: rememberProfile,
    setLanguage: rememberLanguage,
    setReplyLanguage,
    setProjectId,
  };
}
