import { Controller, Get } from '@nestjs/common';
import { ApiOkResponse, ApiOperation, ApiTags } from '@nestjs/swagger';
import { GetCurrentUserId } from '~/common/decorators';
import { MeResponse } from './dto/user.responses';
import { UserService } from './user.service';

@ApiTags('user')
@Controller('users')
export class UserController {
  constructor(private readonly userService: UserService) {}

  @Get('me')
  @ApiOperation({ summary: 'Current authenticated user' })
  @ApiOkResponse({ type: MeResponse })
  getMe(@GetCurrentUserId() userId: string): Promise<MeResponse> {
    return this.userService.getMe(userId);
  }
}
