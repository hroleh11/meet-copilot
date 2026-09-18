import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { ProfileSwitcher } from '~/features/session/ProfileSwitcher';

describe('ProfileSwitcher', () => {
  it('marks the profile it was given, not a hardcoded one', () => {
    render(
      <ProfileSwitcher
        profile="client_call"
        disabled={false}
        onChange={() => undefined}
      />,
    );

    expect(screen.getByRole('radio', { name: 'Клієнт' })).toBeChecked();
    expect(screen.getByRole('radio', { name: 'Дейлі' })).not.toBeChecked();
  });

  it('reports the profile the user picked', () => {
    const onChange = vi.fn();
    render(<ProfileSwitcher profile="daily" disabled={false} onChange={onChange} />);

    fireEvent.click(screen.getByRole('radio', { name: 'Співбесіда' }));

    expect(onChange).toHaveBeenCalledWith('interview_candidate');
  });

  it('locks while a meeting is running', () => {
    render(<ProfileSwitcher profile="daily" disabled onChange={() => undefined} />);

    expect(screen.getByRole('radio', { name: 'Клієнт' })).toBeDisabled();
  });
});
