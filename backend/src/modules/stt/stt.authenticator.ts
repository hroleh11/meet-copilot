import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import type { Env } from '~/common/config';
import { Speaker } from '~/generated/prisma/enums';
import { MeetingsService } from '~/modules/meetings';
import { SttRejection } from './stt-rejection';
import type { SttSessionContext } from './types/stt.types';

interface AccessTokenPayload {
  sub?: string;
}

@Injectable()
export class SttAuthenticator {
  constructor(
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService<Env, true>,
    private readonly meetingsService: MeetingsService,
  ) {}

  async authorize(url: URL, meetingId: string): Promise<SttSessionContext> {
    const userId = this.verifyToken(url.searchParams.get('token'));
    const speaker = parseSpeaker(url.searchParams.get('speaker'));
    const meeting = await this.meetingsService
      .requireOwned(userId, meetingId)
      .catch(() => null);

    if (!meeting || meeting.status !== 'live') {
      throw SttRejection.notFound();
    }

    return { userId, meetingId: meeting.id, language: meeting.language, speaker };
  }

  private verifyToken(token: string | null): string {
    if (!token) {
      throw SttRejection.unauthorized();
    }

    try {
      const payload = this.jwtService.verify<AccessTokenPayload>(token, {
        secret: this.configService.getOrThrow<string>('AT_SECRET'),
      });

      if (!payload.sub) {
        throw SttRejection.unauthorized();
      }

      return payload.sub;
    } catch {
      throw SttRejection.unauthorized();
    }
  }
}

function parseSpeaker(value: string | null): Speaker {
  if (value === Speaker.me || value === Speaker.other) {
    return value;
  }

  throw SttRejection.notFound();
}
