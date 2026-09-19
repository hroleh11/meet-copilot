import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Query,
} from '@nestjs/common';
import { ApiOkResponse, ApiOperation, ApiTags } from '@nestjs/swagger';
import { GetCurrentUserId } from '~/common/decorators';
import { MessageResponse } from '~/common/dto';
import { CreateMeetingDto, ListMeetingsDto, UpdateMeetingDto } from './dto/meetings.dto';
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

  @Patch(':id')
  @ApiOperation({
    summary: 'Rename a meeting or move it into a project',
    description: 'A null projectId takes the meeting out of the project it was in.',
  })
  @ApiOkResponse({ type: MeetingResponse })
  update(
    @GetCurrentUserId() userId: string,
    @Param('id', ParseUUIDPipe) meetingId: string,
    @Body() dto: UpdateMeetingDto,
  ): Promise<MeetingResponse> {
    return this.meetingsService.update(userId, meetingId, dto);
  }

  @Delete(':id')
  @ApiOperation({
    summary: 'Delete a meeting with its transcript, replies and chats',
    description: 'Refused while the meeting is still running.',
  })
  @ApiOkResponse({ type: MessageResponse })
  async remove(
    @GetCurrentUserId() userId: string,
    @Param('id', ParseUUIDPipe) meetingId: string,
  ): Promise<MessageResponse> {
    await this.meetingsService.remove(userId, meetingId);

    return { message: 'Done' };
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
