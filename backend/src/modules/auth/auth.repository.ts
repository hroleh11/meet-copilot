import { Injectable } from '@nestjs/common';
import type { AuthSession, User, UserCredentials } from '~/generated/prisma/client';
import type { AuthClient } from '~/generated/prisma/enums';
import { PrismaService } from '~/infrastructure/prisma';

export type UserWithCredentials = User & { credentials: UserCredentials | null };

@Injectable()
export class AuthRepository {
  constructor(private readonly prisma: PrismaService) {}

  findUserWithCredentialsByEmail(email: string): Promise<UserWithCredentials | null> {
    return this.prisma.user.findUnique({
      where: { email },
      include: { credentials: true },
    });
  }

  findUserById(id: string): Promise<User | null> {
    return this.prisma.user.findUnique({ where: { id } });
  }

  createUser(data: {
    email: string;
    name: string;
    hashedPassword?: string;
    googleId?: string;
  }): Promise<User> {
    return this.prisma.user.create({
      data: {
        email: data.email,
        name: data.name,
        credentials: {
          create: {
            hashedPassword: data.hashedPassword ?? null,
            googleId: data.googleId ?? null,
          },
        },
        settings: { create: {} },
      },
    });
  }

  createSession(data: {
    id: string;
    userId: string;
    hashedRt: string;
    client: AuthClient;
    expiresAt: Date;
  }): Promise<AuthSession> {
    return this.prisma.authSession.create({ data });
  }

  findSession(id: string): Promise<AuthSession | null> {
    return this.prisma.authSession.findUnique({ where: { id } });
  }

  rotateSession(id: string, hashedRt: string, expiresAt: Date): Promise<AuthSession> {
    return this.prisma.authSession.update({
      where: { id },
      data: { hashedRt, expiresAt },
    });
  }

  async deleteSession(id: string): Promise<void> {
    await this.prisma.authSession.deleteMany({ where: { id } });
  }
}
