import { ApiProperty } from '@nestjs/swagger';

export type DependencyStatus = 'up' | 'down';

export class HealthResponse {
  @ApiProperty({ enum: ['ok', 'degraded'], example: 'ok' })
  status: 'ok' | 'degraded';

  @ApiProperty({ enum: ['up', 'down'], example: 'up' })
  postgres: DependencyStatus;

  @ApiProperty({ enum: ['up', 'down'], example: 'up' })
  redis: DependencyStatus;
}
