import { Body, Controller, Get, Param, ParseUUIDPipe, Post, Query } from '@nestjs/common';
import { ApiOkResponse, ApiOperation, ApiTags } from '@nestjs/swagger';
import { GetCurrentUserId } from '~/common/decorators';
import { CreateMeetingDto, ListMeetingsDto } from './dto/meetings.dto';
import { MeetingDetailsResponse, MeetingResponse } from './dto/meetings.responses';
import { MeetingsService } from './meetings.service';

@ApiTags('meetings')
@Controller('meetings')
export class MeetingsController {
  constructor(private readonly meetingsService: MeetingsService) {}

  @Post()
  @ApiOperation({ summary: 'Start a meeting' })
  @ApiOkResponse({ type: MeetingResponse })
  create(
    @GetCurrentUserId() userId: string,
    @Body() dto: CreateMeetingDto,
  ): Promise<MeetingResponse> {
    return this.meetingsService.create(userId, dto);
  }

  @Post(':id/finish')
  @ApiOperation({ summary: 'Finish a meeting' })
  @ApiOkResponse({ type: MeetingResponse })
  finish(
    @GetCurrentUserId() userId: string,
    @Param('id', ParseUUIDPipe) meetingId: string,
  ): Promise<MeetingResponse> {
    return this.meetingsService.finish(userId, meetingId);
  }

  @Get()
  @ApiOperation({
    summary: 'Meetings of the current user, newest first',
    description:
      'One page at a time: pass the id of the last meeting on screen as cursor.',
  })
  @ApiOkResponse({ type: [MeetingResponse] })
  list(
    @GetCurrentUserId() userId: string,
    @Query() query: ListMeetingsDto,
  ): Promise<MeetingResponse[]> {
    return this.meetingsService.list(userId, query);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Meeting with transcript, replies and usage' })
  @ApiOkResponse({ type: MeetingDetailsResponse })
  details(
    @GetCurrentUserId() userId: string,
    @Param('id', ParseUUIDPipe) meetingId: string,
  ): Promise<MeetingDetailsResponse> {
    return this.meetingsService.details(userId, meetingId);
  }
}
