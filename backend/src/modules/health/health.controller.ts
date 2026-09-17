import { Controller, Get, HttpStatus, Res } from '@nestjs/common';
import { ApiOkResponse, ApiOperation, ApiTags } from '@nestjs/swagger';
import type { Response } from 'express';
import { Public } from '~/common/decorators';
import { HealthResponse } from './dto/health.responses';
import { HealthService } from './health.service';

@ApiTags('health')
@Controller('health')
export class HealthController {
  constructor(private readonly healthService: HealthService) {}

  @Get()
  @Public()
  @ApiOperation({ summary: 'Readiness of the service and its stores' })
  @ApiOkResponse({ type: HealthResponse })
  async check(@Res({ passthrough: true }) res: Response): Promise<HealthResponse> {
    const health = await this.healthService.check();

    res.status(health.status === 'ok' ? HttpStatus.OK : HttpStatus.SERVICE_UNAVAILABLE);

    return health;
  }
}
