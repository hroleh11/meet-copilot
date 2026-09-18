import { AnswerView } from '~/features/generation/AnswerView';
import { useAnswer } from '~/features/generation/useAnswer';

export function OverlayApp() {
  const answer = useAnswer();

  return (
    <AnswerView
      mode={answer.mode}
      text={answer.text}
      streaming={answer.streaming}
      error={answer.error}
      copied={answer.copied}
      onCopy={answer.copy}
      onClose={answer.close}
    />
  );
}
