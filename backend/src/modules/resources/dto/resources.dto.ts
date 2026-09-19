import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsEnum,
  IsOptional,
  IsString,
  IsUUID,
  MaxLength,
  MinLength,
} from 'class-validator';
import { ResourceScope } from '~/generated/prisma/enums';

export class AddResourceDto {
  @ApiProperty({ enum: ResourceScope, example: ResourceScope.meeting })
  @IsEnum(ResourceScope)
  scope: ResourceScope;

  @ApiPropertyOptional({ description: 'Required when scope is project' })
  @IsOptional()
  @IsUUID()
  projectId?: string;

  /// The name travels as its own field rather than being read off the upload.
  /// A multipart filename is decoded as latin-1, so anything outside ASCII comes
  /// back as mojibake; a field value is utf-8.
  @ApiProperty({ example: 'Резюме.pdf' })
  @IsString()
  @MinLength(1)
  @MaxLength(200)
  name: string;
}

export class AddResourceTextDto extends AddResourceDto {
  @ApiProperty({ example: 'Співбесіда на позицію Senior Rust, стек: Tokio, Axum.' })
  @IsString()
  @MinLength(1)
  text: string;
}

export class ListResourcesDto {
  @ApiProperty({ enum: ResourceScope, example: ResourceScope.user })
  @IsEnum(ResourceScope)
  scope: ResourceScope;

  @ApiPropertyOptional({ description: 'Required when scope is project' })
  @IsOptional()
  @IsUUID()
  projectId?: string;

  @ApiPropertyOptional({
    description:
      'Meetings materials of one meeting; absent means the ones not attached yet',
  })
  @IsOptional()
  @IsUUID()
  meetingId?: string;
}
