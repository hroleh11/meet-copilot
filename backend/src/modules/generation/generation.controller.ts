import { Body, Controller, Param, ParseUUIDPipe, Post, Res } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import type { Response } from 'express';
import { GetCurrentUserId } from '~/common/decorators';
import { GenerateDto } from './dto/generation.dto';
import { GenerationService } from './generation.service';
import { openSseStream, writeSseEvent } from '~/common/sse';

@ApiTags('generation')
@Controller('meetings')
export class GenerationController {
  constructor(private readonly generationService: GenerationService) {}

  @Post(':id/generate')
  @ApiOperation({
    summary: 'Draft a reply and stream it back as server-sent events',
    description: 'Emits delta events with text, then a single done or error event.',
  })
  async generate(
    @GetCurrentUserId() userId: string,
    @Param('id', ParseUUIDPipe) meetingId: string,
    @Body() dto: GenerateDto,
    @Res() res: Response,
  ): Promise<void> {
    const abort = new AbortController();
    res.on('close', () => abort.abort());

    const events = await this.generationService.start(
      userId,
      meetingId,
      dto.mode,
      dto.screenshot ?? null,
      abort.signal,
    );

    openSseStream(res);

    for await (const event of events) {
      writeSseEvent(res, event);
    }

    res.end();
  }
}
