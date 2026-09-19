import { useCallback, useEffect, useState } from 'react';

const LIFETIME_MS = 12_000;

interface Shown {
  text: string;
}

/// A problem that has been dealt with must stop claiming the screen: a banner
/// left from an earlier press reads as the state of the last one.
export function useTransientMessage(): [string | null, (text: string) => void] {
  const [shown, setShown] = useState<Shown | null>(null);

  useEffect(() => {
    if (!shown) {
      return;
    }

    const timer = window.setTimeout(() => {
      setShown(null);
    }, LIFETIME_MS);

    return () => {
      window.clearTimeout(timer);
    };
  }, [shown]);

  const show = useCallback((text: string) => {
    setShown({ text });
  }, []);

  return [shown?.text ?? null, show];
}
