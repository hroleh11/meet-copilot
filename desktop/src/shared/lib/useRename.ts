import { useState, type KeyboardEvent } from 'react';

export interface Rename {
  editing: boolean;
  draft: string;
  start: () => void;
  change: (value: string) => void;
  cancel: () => void;
  commit: () => void;
  onKeyDown: (event: KeyboardEvent<HTMLInputElement>) => void;
}

/// Renaming happens in place: the row keeps its shape and the title becomes a
/// field. An empty or unchanged name is not a rename, so it just closes.
export function useRename(current: string, save: (name: string) => void): Rename {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(current);

  const start = () => {
    setDraft(current);
    setEditing(true);
  };

  const cancel = () => {
    setEditing(false);
  };

  const commit = () => {
    const name = draft.trim();

    if (name && name !== current) {
      save(name);
    }

    setEditing(false);
  };

  return {
    editing,
    draft,
    start,
    change: setDraft,
    cancel,
    commit,
    onKeyDown: (event) => {
      if (event.key === 'Enter') {
        commit();
      }

      if (event.key === 'Escape') {
        event.stopPropagation();
        cancel();
      }
    },
  };
}
