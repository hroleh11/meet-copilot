import { useState } from 'react';

export function useResettableDraft<T>(source: T): [T, (next: T) => void] {
  const [draft, setDraft] = useState(source);
  const [seen, setSeen] = useState(source);

  if (seen !== source) {
    setSeen(source);
    setDraft(source);
  }

  return [draft, setDraft];
}
