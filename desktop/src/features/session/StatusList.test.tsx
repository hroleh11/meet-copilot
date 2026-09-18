import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { StatusList } from '~/features/session/StatusList';
import type { StatusListProps } from '~/features/session/StatusList';

const props = (over: Partial<StatusListProps> = {}): StatusListProps => ({
  state: 'idle',
  sources: [],
  connection: 'reachable',
  onRetryConnection: () => undefined,
  ...over,
});

describe('StatusList', () => {
  it('shows both sources as off before a meeting starts', () => {
    render(<StatusList {...props()} />);

    expect(screen.getAllByText('Вимкнено')).toHaveLength(2);
    expect(screen.getByText('Сервер на зв’язку')).toBeInTheDocument();
  });

  it('separates a working microphone from unavailable meeting audio', () => {
    render(
      <StatusList
        {...props({
          state: 'listening',
          sources: [
            { speaker: 'me', active: true },
            { speaker: 'other', active: false },
          ],
        })}
      />,
    );

    expect(screen.getByText('Працює')).toBeInTheDocument();
    expect(screen.getByText('Недоступне')).toBeInTheDocument();
    expect(screen.getByText('Слухаю')).toBeInTheDocument();
  });

  it('offers to check the server again when it is silent', () => {
    const onRetryConnection = vi.fn();
    render(<StatusList {...props({ connection: 'unreachable', onRetryConnection })} />);

    fireEvent.click(screen.getByRole('button', { name: /Спробувати ще раз/ }));

    expect(onRetryConnection).toHaveBeenCalled();
  });
});
