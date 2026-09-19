import { useState } from 'react';
import { uk } from '~/shared/i18n/uk';
import { Button, TextInput } from '~/shared/ui';

export interface ChatComposerProps {
  busy: boolean;
  onAsk: (question: string) => void;
}

export function ChatComposer({ busy, onAsk }: ChatComposerProps) {
  const [question, setQuestion] = useState('');

  return (
    <form
      onSubmit={(event) => {
        event.preventDefault();

        if (question.trim() && !busy) {
          onAsk(question.trim());
          setQuestion('');
        }
      }}
      className="shrink-0 border-t border-separator p-3"
    >
      <div className="mx-auto flex max-w-[720px] gap-2">
        <TextInput
          value={question}
          aria-label={uk.chat.placeholder}
          placeholder={uk.chat.placeholder}
          disabled={busy}
          onChange={(event) => {
            setQuestion(event.target.value);
          }}
          className="h-9 flex-grow"
        />
        <Button
          type="submit"
          className="h-9"
          disabled={busy || question.trim().length === 0}
        >
          {uk.chat.send}
        </Button>
      </div>
    </form>
  );
}
