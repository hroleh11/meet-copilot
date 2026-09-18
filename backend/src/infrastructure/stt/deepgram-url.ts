import type { Language } from '~/generated/prisma/enums';

const ENDPOINT = 'wss://api.deepgram.com/v1/listen';

export function buildDeepgramUrl(language: Language): string {
  const url = new URL(ENDPOINT);

  url.searchParams.set('model', 'nova-3');
  url.searchParams.set('language', language);
  url.searchParams.set('encoding', 'linear16');
  url.searchParams.set('sample_rate', '16000');
  url.searchParams.set('channels', '1');
  url.searchParams.set('interim_results', 'true');
  url.searchParams.set('smart_format', 'true');
  url.searchParams.set('endpointing', '300');

  return url.toString();
}
