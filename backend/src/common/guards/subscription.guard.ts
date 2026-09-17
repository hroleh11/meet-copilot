import { type CanActivate, Injectable } from '@nestjs/common';

@Injectable()
export class SubscriptionGuard implements CanActivate {
  canActivate(): boolean {
    return true;
  }
}
