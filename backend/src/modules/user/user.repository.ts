import { Injectable } from '@nestjs/common';
import type { User } from '~/generated/prisma/client';
import { PrismaService } from '~/infrastructure/prisma';

@Injectable()
export class UserRepository {
  constructor(private readonly prisma: PrismaService) {}

  findById(id: string): Promise<User | null> {
    return this.prisma.user.findUnique({ where: { id } });
  }
}
