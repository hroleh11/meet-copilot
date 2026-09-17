import { Injectable } from '@nestjs/common';
import * as argon2 from 'argon2';

@Injectable()
export class HashingService {
  hash(value: string): Promise<string> {
    return argon2.hash(value);
  }

  async compare(value: string, hashed: string): Promise<boolean> {
    try {
      return await argon2.verify(hashed, value);
    } catch {
      return false;
    }
  }
}
