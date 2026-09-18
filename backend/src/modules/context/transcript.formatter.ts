import type { WindowSegment } from '~/modules/meetings';

export function formatTranscript(segments: WindowSegment[]): string {
  return segments.map((segment) => `[${segment.speaker}] ${segment.text}`).join('\n');
}

export function countCharacters(segments: WindowSegment[]): number {
  return segments.reduce((total, segment) => total + segment.text.length, 0);
}
