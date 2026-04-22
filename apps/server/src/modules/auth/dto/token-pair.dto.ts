import { ApiProperty } from '@nestjs/swagger';
import { MeDto } from '../../user/dto/me.dto';

export { MeDto };

export class TokenPairDto {
  @ApiProperty({
    description: 'access token，用于业务接口 Authorization: Bearer',
    example: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...',
  })
  accessToken!: string;

  @ApiProperty({
    description: 'refresh token，用于调用 /auth/refresh 换取新的 access',
    example: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...',
  })
  refreshToken!: string;

  @ApiProperty({ description: 'access token 有效期（秒）', example: 7200 })
  accessExpiresIn!: number;

  @ApiProperty({ description: 'refresh token 有效期（秒）', example: 1209600 })
  refreshExpiresIn!: number;
}

export class LoginResultDto extends TokenPairDto {
  @ApiProperty({ type: MeDto })
  user!: MeDto;
}

export class ChangePasswordResultDto extends TokenPairDto {
  @ApiProperty({ example: true, description: '仅当为 true 时表示改密成功' })
  ok!: boolean;
}

export class LogoutResultDto {
  @ApiProperty({ example: true })
  ok!: boolean;
}
