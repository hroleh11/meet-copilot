import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { useOverlayDrag } from '~/features/generation/useOverlayDrag';

const { setPosition } = vi.hoisted(() => ({ setPosition: vi.fn() }));

vi.mock('@tauri-apps/api/window', () => ({
  PhysicalPosition: class {
    constructor(
      readonly x: number,
      readonly y: number,
    ) {}
  },
  getCurrentWindow: () => ({
    outerPosition: () => Promise.resolve({ x: 200, y: 100 }),
    scaleFactor: () => Promise.resolve(2),
    setPosition,
  }),
}));

function Draggable() {
  const startDrag = useOverlayDrag();

  return (
    <header onPointerDown={startDrag}>
      <span>шапка</span>
    </header>
  );
}

describe('useOverlayDrag', () => {
  it('moves the window by the distance the pointer travelled', async () => {
    render(<Draggable />);

    fireEvent.pointerDown(screen.getByText('шапка'), {
      button: 0,
      screenX: 500,
      screenY: 300,
    });

    await waitFor(() => {
      fireEvent.pointerMove(window, { screenX: 530, screenY: 290 });
      expect(setPosition).toHaveBeenCalledWith(
        expect.objectContaining({ x: 260, y: 80 }),
      );
    });

    fireEvent.pointerUp(window);
  });

  it('stops moving once the pointer is released', async () => {
    render(<Draggable />);

    fireEvent.pointerDown(screen.getByText('шапка'), {
      button: 0,
      screenX: 500,
      screenY: 300,
    });

    await waitFor(() => {
      fireEvent.pointerMove(window, { screenX: 510, screenY: 300 });
      expect(setPosition).toHaveBeenCalled();
    });

    fireEvent.pointerUp(window);
    setPosition.mockClear();
    fireEvent.pointerMove(window, { screenX: 800, screenY: 800 });

    expect(setPosition).not.toHaveBeenCalled();
  });

  it('leaves the window alone for anything but the left button', () => {
    setPosition.mockClear();
    render(<Draggable />);

    fireEvent.pointerDown(screen.getByText('шапка'), { button: 2 });
    fireEvent.pointerMove(window, { screenX: 900, screenY: 900 });

    expect(setPosition).not.toHaveBeenCalled();
  });
});
