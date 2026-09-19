import { ApiProperty } from '@nestjs/swagger';
import { IsString, MaxLength, MinLength } from 'class-validator';

export class CreateProjectDto {
  @ApiProperty({ example: 'Співбесіда в Acme' })
  @IsString()
  @MinLength(1)
  @MaxLength(120)
  name: string;
}

export class RenameProjectDto extends CreateProjectDto {}
