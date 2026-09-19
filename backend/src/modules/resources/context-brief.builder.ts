import { Injectable } from '@nestjs/common';
import { fence } from '~/common/untrusted';
import { ResourceScope } from '~/generated/prisma/enums';
import type { BriefLevels, BriefSource } from './types/resources.types';

const TOTAL_BUDGET_CHARS = 10_000;

const LEVEL_BUDGET_CHARS: Record<ResourceScope, number> = {
  [ResourceScope.user]: 2_000,
  [ResourceScope.project]: 4_000,
  [ResourceScope.meeting]: 6_000,
};

const LABEL: Record<ResourceScope, string> = {
  [ResourceScope.user]: 'about-me',
  [ResourceScope.project]: 'about-project',
  [ResourceScope.meeting]: 'about-meeting',
};

const ORDER: ResourceScope[] = [
  ResourceScope.user,
  ResourceScope.project,
  ResourceScope.meeting,
];

export function briefBudget(scope: ResourceScope): number {
  return LEVEL_BUDGET_CHARS[scope] ?? 0;
}

/// The order of the levels is the priority rule: the meeting sits closest to the
/// question and is filled first, so a shared budget running out takes the user
/// level away before it touches this call. Everything inside is somebody else's
/// text, so it travels fenced as material.
@Injectable()
export class ContextBriefBuilder {
  build(levels: BriefLevels): string | null {
    const kept = new Map<ResourceScope, string>();
    let left = TOTAL_BUDGET_CHARS;

    for (const scope of [...ORDER].reverse()) {
      const body = join(levels[scope] ?? []);
      const room = Math.min(briefBudget(scope), left);

      if (body.length === 0 || room === 0) {
        continue;
      }

      const text = body.length <= room ? body : `${body.slice(0, room)}…`;
      kept.set(scope, text);
      left -= Math.min(body.length, room);
    }

    const blocks = ORDER.filter((scope) => kept.has(scope)).map((scope) =>
      fence(LABEL[scope] ?? scope, kept.get(scope) ?? ''),
    );

    return blocks.length === 0 ? null : fence('materials', blocks.join('\n\n'));
  }
}

function join(sources: BriefSource[]): string {
  return sources
    .filter((source) => source.body.trim().length > 0)
    .map((source) => `## ${source.name}\n${source.body.trim()}`)
    .join('\n\n');
}
