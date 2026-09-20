import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { SessionSidebar } from '~/features/session/SessionSidebar';
import type { SessionSidebarProps } from '~/features/session/SessionSidebar';
import { uk } from '~/shared/i18n/uk';

const { invoke } = vi.hoisted(() => ({ invoke: vi.fn() }));

vi.mock('@tauri-apps/api/core', () => ({ invoke }));

vi.mock('@tauri-apps/api/window', () => ({
  getCurrentWindow: () => ({ onFocusChanged: () => Promise.resolve(() => undefined) }),
}));

invoke.mockResolvedValue(null);

function props(over: Partial<SessionSidebarProps> = {}): SessionSidebarProps {
  return {
    profile: 'interview_candidate',
    language: 'uk',
    replyLanguage: null,
    projectId: null,
    projects: [],
    materials: {
      resources: [],
      loading: false,
      reading: false,
      error: null,
      addFile: vi.fn(),
      addText: vi.fn(),
      remove: vi.fn(),
    },
    state: 'idle',
    busy: false,
    hotkeys: {
      reply: 'Alt+R',
      alternative: 'Alt+A',
      screenshot: 'Alt+S',
      hide: 'Alt+H',
      interact: 'Alt+I',
    },
    notice: null,
    error: null,
    onProfileChange: vi.fn(),
    onLanguageChange: vi.fn(),
    onReplyLanguageChange: vi.fn(),
    onProjectChange: vi.fn(),
    onStart: vi.fn(),
    onStop: vi.fn(),
    ...over,
  };
}

describe('SessionSidebar', () => {
  /// An interview opens in Ukrainian and carries on in English, so the language
  /// has to be reachable while the meeting is running, not only before it.
  it('lets the language change in the middle of a meeting', () => {
    const onLanguageChange = vi.fn();
    render(<SessionSidebar {...props({ state: 'listening', onLanguageChange })} />);

    const select = screen.getByLabelText(uk.meeting.language);
    expect(select).not.toBeDisabled();

    fireEvent.change(select, { target: { value: 'en' } });

    expect(onLanguageChange).toHaveBeenCalledWith('en');
  });

  it('keeps the profile locked once the meeting has started', () => {
    render(<SessionSidebar {...props({ state: 'listening' })} />);

    expect(screen.getByLabelText(uk.meeting.project)).toBeDisabled();
  });

  it('reads «as in the conversation» as no pinned reply language', () => {
    const onReplyLanguageChange = vi.fn();
    render(<SessionSidebar {...props({ replyLanguage: 'en', onReplyLanguageChange })} />);

    fireEvent.change(screen.getByLabelText(uk.meeting.replyLanguage), {
      target: { value: 'auto' },
    });

    expect(onReplyLanguageChange).toHaveBeenCalledWith(null);
  });
});
