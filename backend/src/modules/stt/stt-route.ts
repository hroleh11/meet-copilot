const UUID =
  '[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}';

export function buildSttRoute(apiPrefix: string): RegExp {
  const prefix = apiPrefix.replace(/^\/+|\/+$/g, '');

  return new RegExp(`^/${prefix}/meetings/(${UUID})/stt$`);
}

export function matchMeetingId(route: RegExp, pathname: string): string | null {
  return route.exec(pathname)?.[1] ?? null;
}
