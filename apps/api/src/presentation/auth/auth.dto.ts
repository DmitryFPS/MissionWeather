import { IsEmail, IsString, MinLength } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class LoginDto {
  @ApiProperty({ example: 'admin@missionweather.local' }) @IsEmail() email!: string;
  @ApiProperty({ example: 'admin123' }) @IsString() @MinLength(4) password!: string;
}

export class RegisterDto {
  @ApiProperty() @IsEmail() email!: string;
  @ApiProperty() @IsString() @MinLength(4) password!: string;
  @ApiProperty() @IsString() name!: string;
}
