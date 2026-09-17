import { ApiProperty } from '@nestjs/swagger';

export class TokensResponse {
  @ApiProperty()
  accessToken: string;

  @ApiProperty()
  refreshToken: string;

  @ApiProperty({ example: 900, description: 'Access token lifetime in seconds' })
  expiresIn: number;
}
