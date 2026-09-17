import { ApiProperty } from '@nestjs/swagger';
import { IsEmail, IsNotEmpty, IsString, Length, Matches } from 'class-validator';

export class RegisterDto {
  @ApiProperty({ example: 'me@example.com' })
  @IsEmail()
  email: string;

  @ApiProperty({ example: 'Yuriy Shpak' })
  @IsString()
  @Length(2, 100)
  name: string;

  @ApiProperty({ example: 'password1' })
  @IsString()
  @Length(8, 100)
  @Matches(/(?=.*[A-Za-z])(?=.*\d)/, {
    message: 'password must contain at least one letter and one digit',
  })
  password: string;
}

export class LoginDto {
  @ApiProperty({ example: 'me@example.com' })
  @IsString()
  @IsNotEmpty()
  email: string;

  @ApiProperty({ example: 'password1' })
  @IsString()
  @IsNotEmpty()
  password: string;
}

export class RefreshDto {
  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  refreshToken: string;
}

export class ExchangeCodeDto {
  @ApiProperty({ description: 'One-time code delivered to the app deep link' })
  @IsString()
  @IsNotEmpty()
  code: string;
}
