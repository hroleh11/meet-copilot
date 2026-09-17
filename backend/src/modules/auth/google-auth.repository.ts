import { Injectable } from '@nestjs/common';
import type { User } from '~/generated/prisma/client';
import { PrismaService } from '~/infrastructure/prisma';

@Injectable()
export class GoogleAuthRepository {
  constructor(private readonly prisma: PrismaService) {}

  async findUserByGoogleId(googleId: string): Promise<User | null> {
    const credentials = await this.prisma.userCredentials.findUnique({
      where: { googleId },
      include: { user: true },
    });

    return credentials?.user ?? null;
  }

  async linkGoogleId(userId: string, googleId: string): Promise<void> {
    await this.prisma.userCredentials.update({
      where: { userId },
      data: { googleId },
    });
  }
}
