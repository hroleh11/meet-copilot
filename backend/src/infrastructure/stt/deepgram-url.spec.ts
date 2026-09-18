import { Language } from '~/generated/prisma/enums';
import { buildDeepgramUrl } from './deepgram-url';

describe('buildDeepgramUrl', () => {
  it('asks for the canonical audio format the desktop sends', () => {
    const url = new URL(buildDeepgramUrl(Language.uk));

    expect(url.origin + url.pathname).toBe('wss://api.deepgram.com/v1/listen');
    expect(url.searchParams.get('encoding')).toBe('linear16');
    expect(url.searchParams.get('sample_rate')).toBe('16000');
    expect(url.searchParams.get('channels')).toBe('1');
  });

  it('passes the meeting language through', () => {
    expect(new URL(buildDeepgramUrl(Language.ru)).searchParams.get('language')).toBe('ru');
  });

  it('keeps interim results on so the app can show live text', () => {
    expect(
      new URL(buildDeepgramUrl(Language.en)).searchParams.get('interim_results'),
    ).toBe('true');
  });
});
