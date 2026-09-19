import { act, renderHook } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { useResources } from '~/features/resources/useResources';
import { USER_RESOURCES } from '~/features/resources/scopes';
import type { Resource } from '~/shared/ipc';

const { invoke } = vi.hoisted(() => ({ invoke: vi.fn() }));

vi.mock('@tauri-apps/api/core', () => ({ invoke }));

const POLL_MS = 700;

const pending: Resource = {
  id: 'res-1',
  projectId: null,
  meetingId: null,
  kind: 'pdf',
  name: 'cv.pdf',
  byteSize: 84_211,
  status: 'pending',
  failure: null,
  createdAt: '2026-09-19T00:00:00.000Z',
};

describe('useResources', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    invoke.mockReset();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  /// A single timeout asked once and then stopped, because the list of ids being
  /// waited on does not change while they are still being read. The panel then sat
  /// on «Читаємо…» until the screen was opened again.
  it('keeps asking about a material until it stops being pending', async () => {
    let asked = 0;

    invoke.mockImplementation((command: string) => {
      if (command === 'list_resources') {
        return Promise.resolve([pending]);
      }

      if (command === 'get_resource') {
        asked += 1;

        return Promise.resolve(asked < 3 ? pending : { ...pending, status: 'ready' });
      }

      return Promise.resolve(null);
    });

    const { result } = renderHook(() => useResources(USER_RESOURCES));

    await act(async () => {
      await vi.advanceTimersByTimeAsync(0);
    });
    expect(result.current.reading).toBe(true);

    await act(async () => {
      await vi.advanceTimersByTimeAsync(POLL_MS * 3);
    });

    expect(asked).toBeGreaterThanOrEqual(3);
    expect(result.current.resources[0]?.status).toBe('ready');
    expect(result.current.reading).toBe(false);
  });

  it('stops asking once nothing is pending', async () => {
    invoke.mockImplementation((command: string) =>
      Promise.resolve(
        command === 'list_resources' ? [{ ...pending, status: 'ready' }] : null,
      ),
    );

    const { result } = renderHook(() => useResources(USER_RESOURCES));

    await act(async () => {
      await vi.advanceTimersByTimeAsync(POLL_MS * 3);
    });

    expect(result.current.reading).toBe(false);
    expect(invoke).not.toHaveBeenCalledWith('get_resource', expect.anything());
  });
});
