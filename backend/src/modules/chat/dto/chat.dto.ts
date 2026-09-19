import { ApiPropertyOptional, ApiProperty } from '@nestjs/swagger';
import { IsOptional, IsString, MaxLength, MinLength } from 'class-validator';

export class AskDto {
  @ApiProperty({ example: 'Скільки тривала зустріч?' })
  @IsString()
  @MinLength(1)
  @MaxLength(1_000)
  question: string;
}

export class ListChatsDto {
  @ApiPropertyOptional({ example: 'реліз' })
  @IsOptional()
  @IsString()
  @MaxLength(200)
  query?: string;
}
