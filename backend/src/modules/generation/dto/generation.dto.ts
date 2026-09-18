import { ApiProperty } from '@nestjs/swagger';
import { IsEnum } from 'class-validator';
import { GenerationMode } from '~/generated/prisma/enums';

export class GenerateDto {
  @ApiProperty({ enum: GenerationMode, example: GenerationMode.reply })
  @IsEnum(GenerationMode)
  mode: GenerationMode;
}
