import { ApiProperty } from '@nestjs/swagger';
import { IsString, Matches, MaxLength, MinLength } from 'class-validator';

export class LoginDto {
  @ApiProperty({
    example: 'jiangjiang',
    description: '用户名，3-32 位字母/数字/下划线',
    minLength: 3,
    maxLength: 32,
  })
  @IsString()
  @MinLength(3)
  @MaxLength(32)
  @Matches(/^[A-Za-z0-9_]+$/, { message: 'username 只能包含字母、数字和下划线' })
  username!: string;

  @ApiProperty({
    example: '251212',
    description: '明文密码，长度 6-64',
    minLength: 6,
    maxLength: 64,
  })
  @IsString()
  @MinLength(6)
  @MaxLength(64)
  password!: string;
}
