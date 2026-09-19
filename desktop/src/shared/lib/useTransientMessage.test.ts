import { act, renderHook } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { useTransientMessage } from '~/shared/lib/useTransientMessage';

describe('useTransientMessage', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('drops the message once it has been read', () => {
    const { result } = renderHook(() => useTransientMessage());

    act(() => {
      result.current[1]('не вдалося прочитати екран');
    });

    expect(result.current[0]).toBe('не вдалося прочитати екран');

    act(() => {
      vi.advanceTimersByTime(12_000);
    });

    expect(result.current[0]).toBeNull();
  });

  it('starts the wait again when the same problem comes back', () => {
    const { result } = renderHook(() => useTransientMessage());

    act(() => {
      result.current[1]('той самий збій');
      vi.advanceTimersByTime(11_000);
      result.current[1]('той самий збій');
      vi.advanceTimersByTime(6_000);
    });

    expect(result.current[0]).toBe('той самий збій');
  });
});
