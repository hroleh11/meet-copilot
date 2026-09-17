import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString } from 'class-validator';

export class ExchangeCodeDto {
  @ApiProperty({ description: 'One-time code delivered to the desktop deep link' })
  @IsString()
  @IsNotEmpty()
  code: string;
}

export class DesktopRefreshDto {
  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  refreshToken: string;
}
