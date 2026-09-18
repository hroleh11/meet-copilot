import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { OnboardingScreen } from '~/features/onboarding/OnboardingScreen';
import type { OnboardingScreenProps } from '~/features/onboarding/OnboardingScreen';
import type { LocalSettings } from '~/shared/ipc';

const { checkBackend } = vi.hoisted(() => ({ checkBackend: vi.fn() }));

vi.mock('~/shared/ipc/commands', () => ({
  checkBackend,
  listAudioDevices: () => Promise.resolve([]),
  startAudioCheck: () => Promise.resolve({ systemAudioProblem: null }),
  stopAudioCheck: () => Promise.resolve(),
}));

const settings: LocalSettings = {
  backendUrl: 'http://localhost:5070/api/v1',
  inputDevice: null,
  hotkeys: { reply: 'F1', alternative: 'F2', hide: 'F3' },
  onboarded: false,
};

const props = (over: Partial<OnboardingScreenProps> = {}): OnboardingScreenProps => ({
  settings,
  signedIn: false,
  profileEmail: null,
  opening: false,
  error: null,
  onSave: () => undefined,
  onSignIn: () => undefined,
  ...over,
});

describe('OnboardingScreen', () => {
  it('waits for the server and the sign-in before letting the user in', async () => {
    checkBackend.mockRejectedValue({ kind: 'backend', failure: 'unavailable' });
    render(<OnboardingScreen {...props()} />);

    await waitFor(() => {
      expect(screen.getByText('Сервера не чути')).toBeInTheDocument();
    });

    expect(screen.getByRole('button', { name: /Готово/ })).toBeDisabled();
    expect(screen.getByRole('button', { name: /Увійти через Google/ })).toBeDisabled();
  });

  it('remembers that the first run is over once both steps are done', async () => {
    checkBackend.mockResolvedValue('ok');
    const onSave = vi.fn();
    render(
      <OnboardingScreen
        {...props({ signedIn: true, profileEmail: 'me@example.com', onSave })}
      />,
    );

    await waitFor(() => {
      expect(screen.getByRole('button', { name: /Готово/ })).toBeEnabled();
    });

    fireEvent.click(screen.getByRole('button', { name: /Готово/ }));

    expect(onSave).toHaveBeenCalledWith(expect.objectContaining({ onboarded: true }));
  });
});
