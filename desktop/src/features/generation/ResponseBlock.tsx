import { uk } from '~/shared/i18n/uk';

export interface ResponseBlockProps {
  text: string;
  streaming: boolean;
  error: string | null;
}

export function ResponseBlock({ text, streaming, error }: ResponseBlockProps) {
  if (error) {
    return <p className="text-body text-danger">{error}</p>;
  }

  if (text.length === 0) {
    return (
      <p className="text-body text-ink-tertiary">{streaming ? uk.answer.waiting : ''}</p>
    );
  }

  return <p className="text-body whitespace-pre-line text-ink-primary">{text}</p>;
}
