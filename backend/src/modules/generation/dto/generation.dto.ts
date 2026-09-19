import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsBase64,
  IsEnum,
  IsIn,
  IsOptional,
  MaxLength,
  ValidateNested,
} from 'class-validator';
import { GenerationMode } from '~/generated/prisma/enums';

const SCREENSHOT_TYPES = ['image/jpeg', 'image/png'];
const MAX_SCREENSHOT_CHARS = 700_000;

export class ScreenshotDto {
  @ApiProperty({ enum: SCREENSHOT_TYPES, example: 'image/jpeg' })
  @IsIn(SCREENSHOT_TYPES)
  mimeType: string;

  @ApiProperty({ description: 'The picture itself, base64 without the data url prefix' })
  @IsBase64()
  @MaxLength(MAX_SCREENSHOT_CHARS)
  dataBase64: string;
}

export class GenerateDto {
  @ApiProperty({ enum: GenerationMode, example: GenerationMode.reply })
  @IsEnum(GenerationMode)
  mode: GenerationMode;

  @ApiPropertyOptional({ type: ScreenshotDto })
  @IsOptional()
  @ValidateNested()
  @Type(() => ScreenshotDto)
  screenshot?: ScreenshotDto;
}
