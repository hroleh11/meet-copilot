import { renderHook } from '@testing-library/react';
import type { UIEvent } from 'react';
import { describe, expect, it, vi } from 'vitest';
import { useEndOfList } from '~/features/history/useEndOfList';

const scroll = (scrollTop: number): UIEvent<HTMLElement> =>
  ({
    currentTarget: { scrollHeight: 1_000, clientHeight: 400, scrollTop },
  }) as unknown as UIEvent<HTMLElement>;

describe('useEndOfList', () => {
  it('stays quiet while the end is far away', () => {
    const onReachEnd = vi.fn();
    const { result } = renderHook(() => useEndOfList(onReachEnd));

    result.current(scroll(100));

    expect(onReachEnd).not.toHaveBeenCalled();
  });

  it('asks for the next page as the end comes into reach', () => {
    const onReachEnd = vi.fn();
    const { result } = renderHook(() => useEndOfList(onReachEnd));

    result.current(scroll(520));

    expect(onReachEnd).toHaveBeenCalledOnce();
  });
});
