import { Body, Controller, Get, Put } from '@nestjs/common';
import { ApiOkResponse, ApiOperation, ApiTags } from '@nestjs/swagger';
import { GetCurrentUserId } from '~/common/decorators';
import { UpdateSettingsDto } from './dto/settings.dto';
import { SettingsResponse } from './dto/settings.responses';
import { SettingsService } from './settings.service';

@ApiTags('settings')
@Controller('settings')
export class SettingsController {
  constructor(private readonly settingsService: SettingsService) {}

  @Get()
  @ApiOperation({ summary: 'Reply style and meeting defaults' })
  @ApiOkResponse({ type: SettingsResponse })
  get(@GetCurrentUserId() userId: string): Promise<SettingsResponse> {
    return this.settingsService.get(userId);
  }

  @Put()
  @ApiOperation({ summary: 'Update reply style and meeting defaults' })
  @ApiOkResponse({ type: SettingsResponse })
  update(
    @GetCurrentUserId() userId: string,
    @Body() dto: UpdateSettingsDto,
  ): Promise<SettingsResponse> {
    return this.settingsService.update(userId, dto);
  }
}
