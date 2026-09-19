import { renderHook } from '@testing-library/react';
import { act } from 'react';
import { describe, expect, it, vi } from 'vitest';
import { useAnswer } from '~/features/generation/useAnswer';
import { useGenerationStore } from '~/shared/store/generationStore';
import { useSessionStore } from '~/shared/store/sessionStore';

vi.mock('@tauri-apps/api/event', () => ({
  listen: () => Promise.resolve(() => undefined),
}));

describe('useAnswer', () => {
  it('drops the answer of a meeting that is over', () => {
    act(() => {
      useSessionStore.getState().setState('listening', 'm-1', null);
      useGenerationStore.getState().begin('reply', true);
      useGenerationStore.getState().append('Я б скоротив анкету.');
    });

    const { result } = renderHook(() => useAnswer());

    expect(result.current.text).toBe('Я б скоротив анкету.');

    act(() => {
      useSessionStore.getState().setState('idle', null, null);
    });

    expect(result.current).toMatchObject({
      text: '',
      withScreenshot: false,
      streaming: false,
      error: null,
    });
  });

  it('keeps the answer while the meeting is still winding down', () => {
    act(() => {
      useSessionStore.getState().setState('listening', 'm-1', null);
      useGenerationStore.getState().begin('reply', false);
      useGenerationStore.getState().append('Ще видно.');
    });

    const { result } = renderHook(() => useAnswer());

    act(() => {
      useSessionStore.getState().setState('stopping', 'm-1', null);
    });

    expect(result.current.text).toBe('Ще видно.');
  });
});
