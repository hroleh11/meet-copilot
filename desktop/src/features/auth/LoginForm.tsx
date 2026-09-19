import { useState } from 'react';
import { uk } from '~/shared/i18n/uk';
import { Button, Field, TextInput } from '~/shared/ui';

export interface LoginFormProps {
  submitting: boolean;
  onSubmit: (email: string, password: string) => void;
}

export function LoginForm({ submitting, onSubmit }: LoginFormProps) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  return (
    <form
      className="flex w-full flex-col gap-3"
      onSubmit={(event) => {
        event.preventDefault();
        onSubmit(email, password);
      }}
    >
      <Field label={uk.auth.email}>
        <TextInput
          className="w-full"
          type="email"
          autoComplete="username"
          placeholder={uk.auth.emailPlaceholder}
          value={email}
          onChange={(event) => {
            setEmail(event.target.value);
          }}
        />
      </Field>

      <Field label={uk.auth.password}>
        <TextInput
          className="w-full"
          type="password"
          autoComplete="current-password"
          placeholder={uk.auth.passwordPlaceholder}
          value={password}
          onChange={(event) => {
            setPassword(event.target.value);
          }}
        />
      </Field>

      <Button
        type="submit"
        className="h-10"
        disabled={submitting || email.length === 0 || password.length === 0}
      >
        {submitting ? uk.auth.submitting : uk.auth.submit}
      </Button>
    </form>
  );
}
