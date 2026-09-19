import { ApiProperty } from '@nestjs/swagger';

export class ChatSessionResponse {
  @ApiProperty()
  id: string;

  @ApiProperty({ nullable: true, type: String })
  title: string | null;

  @ApiProperty()
  messageCount: number;

  @ApiProperty()
  updatedAt: string;
}

export class ChatMessageResponse {
  @ApiProperty()
  id: string;

  @ApiProperty()
  question: string;

  @ApiProperty()
  answer: string;

  @ApiProperty()
  createdAt: string;
}
