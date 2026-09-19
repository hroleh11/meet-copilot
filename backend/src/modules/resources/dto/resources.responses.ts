import { ApiProperty } from '@nestjs/swagger';
import {
  ResourceFailure,
  ResourceKind,
  ResourceScope,
  ResourceStatus,
} from '~/generated/prisma/enums';

export class ResourceResponse {
  @ApiProperty()
  id: string;

  @ApiProperty({ enum: ResourceScope })
  scope: ResourceScope;

  @ApiProperty({ nullable: true, type: String })
  projectId: string | null;

  @ApiProperty({ nullable: true, type: String })
  meetingId: string | null;

  @ApiProperty({ enum: ResourceKind })
  kind: ResourceKind;

  @ApiProperty()
  name: string;

  @ApiProperty()
  byteSize: number;

  @ApiProperty({ enum: ResourceStatus })
  status: ResourceStatus;

  @ApiProperty({ enum: ResourceFailure, nullable: true })
  failure: ResourceFailure | null;

  @ApiProperty()
  createdAt: Date;
}

export class ResourceContentResponse {
  @ApiProperty()
  name: string;

  @ApiProperty({ nullable: true, type: String })
  text: string | null;

  @ApiProperty({
    nullable: true,
    type: String,
    description:
      'The compressed version the model is given, when the full text did not fit',
  })
  digest: string | null;

  @ApiProperty()
  chars: number;
}

export class ResourceLimitsResponse {
  @ApiProperty({ description: 'Largest file that can be uploaded, in bytes' })
  maxBytes: number;

  @ApiProperty({ description: 'Longest text a material can hold, in characters' })
  maxTextChars: number;
}
