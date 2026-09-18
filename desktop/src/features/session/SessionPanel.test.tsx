import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { SessionPanel } from '~/features/session/SessionPanel';
import type { SessionPanelProps } from '~/features/session/SessionPanel';
import type { UserSettings } from '~/shared/ipc';

const settings: UserSettings = {
  style: null,
  defaultLanguage: 'en',
  defaultProfile: 'interview_candidate',
};

const props = (over: Partial<SessionPanelProps> = {}): SessionPanelProps => ({
  state: 'idle',
  busy: false,
  notice: null,
  error: null,
  defaults: settings,
  onStart: () => undefined,
  onStop: () => undefined,
  ...over,
});

describe('SessionPanel', () => {
  it('starts a meeting with the settings chosen by the user', () => {
    const onStart = vi.fn();
    render(<SessionPanel {...props({ onStart })} />);

    fireEvent.click(screen.getByRole('button', { name: /Почати слухати/ }));

    expect(onStart).toHaveBeenCalledWith('interview_candidate', 'en');
  });

  it('offers to stop while listening and locks the pickers', () => {
    const onStop = vi.fn();
    render(<SessionPanel {...props({ state: 'listening', onStop })} />);

    expect(screen.getByText('Слухаю')).toBeInTheDocument();
    expect(screen.getByLabelText('Мова')).toBeDisabled();

    fireEvent.click(screen.getByRole('button', { name: /Зупинити/ }));

    expect(onStop).toHaveBeenCalled();
  });

  it('reports a problem with the meeting audio without hiding the controls', () => {
    render(
      <SessionPanel
        {...props({ state: 'listening', notice: 'Звук зустрічі недоступний' })}
      />,
    );

    expect(screen.getByText('Звук зустрічі недоступний')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Зупинити/ })).toBeEnabled();
  });
});
