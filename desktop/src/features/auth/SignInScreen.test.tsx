import { render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { SignInScreen } from '~/features/auth/SignInScreen';

describe('SignInScreen', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('invites the user to sign in through the browser', () => {
    render(<SignInScreen opening={false} error={null} onSignIn={() => undefined} />);

    expect(screen.getByRole('button', { name: /Увійти через Google/ })).toBeEnabled();
    expect(screen.getByText(/Вхід відкриється в браузері/)).toBeInTheDocument();
  });

  it('disables the button while the browser is opening', () => {
    render(<SignInScreen opening error={null} onSignIn={() => undefined} />);

    expect(screen.getByRole('button', { name: /Відкриваємо браузер/ })).toBeDisabled();
  });

  it('shows why a sign-in failed', () => {
    render(
      <SignInScreen
        opening={false}
        error="Сервер недоступний"
        onSignIn={() => undefined}
      />,
    );

    expect(screen.getByText('Сервер недоступний')).toBeInTheDocument();
  });
});
