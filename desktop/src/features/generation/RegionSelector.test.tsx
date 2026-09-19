import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { RegionSelector } from '~/features/generation/RegionSelector';

function selector(onPick = vi.fn(), onCancel = vi.fn()) {
  render(<RegionSelector onPick={onPick} onCancel={onCancel} />);

  return { onPick, onCancel, surface: screen.getByRole('main') };
}

describe('RegionSelector', () => {
  it('reports the rectangle the pointer drew', () => {
    const { onPick, surface } = selector();

    fireEvent.pointerDown(surface, { clientX: 120, clientY: 80 });
    fireEvent.pointerMove(surface, { clientX: 320, clientY: 200 });
    fireEvent.pointerUp(surface);

    expect(onPick).toHaveBeenCalledWith({ x: 120, y: 80, width: 200, height: 120 });
  });

  it('reads a rectangle drawn upwards the same way', () => {
    const { onPick, surface } = selector();

    fireEvent.pointerDown(surface, { clientX: 320, clientY: 200 });
    fireEvent.pointerMove(surface, { clientX: 120, clientY: 80 });
    fireEvent.pointerUp(surface);

    expect(onPick).toHaveBeenCalledWith({ x: 120, y: 80, width: 200, height: 120 });
  });

  it('treats a click without a drag as a cancel', () => {
    const { onPick, onCancel, surface } = selector();

    fireEvent.pointerDown(surface, { clientX: 120, clientY: 80 });
    fireEvent.pointerUp(surface);

    expect(onPick).not.toHaveBeenCalled();
    expect(onCancel).toHaveBeenCalled();
  });

  it('cancels on Escape', () => {
    const { onCancel } = selector();

    fireEvent.keyDown(window, { key: 'Escape' });

    expect(onCancel).toHaveBeenCalled();
  });
});
