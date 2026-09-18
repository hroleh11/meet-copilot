import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { SignInScreen } from '~/features/auth/SignInScreen';
import type { SignInScreenProps } from '~/features/auth/SignInScreen';

const props = (over: Partial<SignInScreenProps> = {}): SignInScreenProps => ({
  submitting: false,
  opening: false,
  error: null,
  onSubmit: () => undefined,
  onSignIn: () => undefined,
  ...over,
});

describe('SignInScreen', () => {
  it('keeps the sign-in button out of reach until both fields are filled', () => {
    render(<SignInScreen {...props()} />);

    expect(screen.getByRole('button', { name: 'Увійти' })).toBeDisabled();

    fireEvent.change(screen.getByLabelText('Email'), {
      target: { value: 'me@example.com' },
    });

    expect(screen.getByRole('button', { name: 'Увійти' })).toBeDisabled();
  });

  it('signs in with what the user typed', () => {
    const onSubmit = vi.fn();
    render(<SignInScreen {...props({ onSubmit })} />);

    fireEvent.change(screen.getByLabelText('Email'), {
      target: { value: 'me@example.com' },
    });
    fireEvent.change(screen.getByLabelText('Пароль'), {
      target: { value: 'password1' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Увійти' }));

    expect(onSubmit).toHaveBeenCalledWith('me@example.com', 'password1');
  });

  it('opens the browser for Google and says so', () => {
    const onSignIn = vi.fn();
    render(<SignInScreen {...props({ onSignIn })} />);

    fireEvent.click(screen.getByRole('button', { name: /Продовжити з Google/ }));

    expect(onSignIn).toHaveBeenCalled();
    expect(screen.getByText(/Відкриється у браузері/)).toBeInTheDocument();
  });

  it('shows why a sign-in failed', () => {
    render(<SignInScreen {...props({ error: 'Невірний email або пароль' })} />);

    expect(screen.getByText('Невірний email або пароль')).toBeInTheDocument();
  });
});
