import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { SettingsNav } from '~/features/settings/SettingsNav';

describe('SettingsNav', () => {
  it('marks the open tab', () => {
    render(<SettingsNav tab="audio" onChange={vi.fn()} />);

    expect(screen.getByRole('button', { name: 'Аудіо' })).toHaveAttribute(
      'aria-current',
      'true',
    );
    expect(screen.getByRole('button', { name: 'Загальні' })).toHaveAttribute(
      'aria-current',
      'false',
    );
  });

  it('asks for the tab that was clicked', () => {
    const onChange = vi.fn();
    render(<SettingsNav tab="general" onChange={onChange} />);

    fireEvent.click(screen.getByRole('button', { name: 'Гарячі клавіші' }));

    expect(onChange).toHaveBeenCalledWith('hotkeys');
  });
});
