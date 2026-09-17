import { buildSttRoute, matchMeetingId } from './stt-route';

const route = buildSttRoute('api/v1');
const meetingId = '22d2c302-47be-4450-9b49-04a224bc912c';

describe('stt route', () => {
  it('reads the meeting id out of the path', () => {
    expect(matchMeetingId(route, `/api/v1/meetings/${meetingId}/stt`)).toBe(meetingId);
  });

  it('ignores paths that are not the speech stream', () => {
    expect(matchMeetingId(route, `/api/v1/meetings/${meetingId}`)).toBeNull();
    expect(matchMeetingId(route, '/api/v1/meetings/not-a-uuid/stt')).toBeNull();
    expect(matchMeetingId(route, '/health')).toBeNull();
  });

  it('accepts a prefix written with slashes', () => {
    expect(
      matchMeetingId(buildSttRoute('/api/v1/'), `/api/v1/meetings/${meetingId}/stt`),
    ).toBe(meetingId);
  });
});
