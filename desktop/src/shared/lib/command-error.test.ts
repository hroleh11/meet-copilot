import { describe, expect, it } from 'vitest';
import { errorMessage } from '~/shared/lib/command-error';

describe('errorMessage', () => {
  it('names the missing Screen Recording permission', () => {
    const message = errorMessage(
      { kind: 'screen', failure: null, message: 'Screen Recording is not allowed' },
      'fallback',
    );

    expect(message).toContain('Запис екрана');
  });

  it('asks for a meeting when none is running', () => {
    const message = errorMessage(
      { kind: 'session', failure: null, message: 'No meeting is running right now' },
      'fallback',
    );

    expect(message).toContain('почніть зустріч');
  });

  it('prefers what the server said over the kind', () => {
    const message = errorMessage(
      { kind: 'backend', failure: 'unavailable', message: 'down' },
      'fallback',
    );

    expect(message).toContain('Сервер не відповідає');
  });

  it('falls back when the value is not an error of ours', () => {
    expect(errorMessage('boom', 'fallback')).toBe('fallback');
  });
});
