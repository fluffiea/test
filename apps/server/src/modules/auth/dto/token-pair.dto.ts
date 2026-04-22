import { ApiProperty } from '@nestjs/swagger';

export class MeDto {
  @ApiProperty({ example: '65f1c2e4a1b2c3d4e5f67890', description: '用户 ObjectId 字符串' })
  id!: string;

  @ApiProperty({ example: 'jiangjiang' })
  username!: string;

  @ApiProperty({ example: '匠匠' })
  nickname!: string;

  @ApiProperty({ example: '/static/default-avatar.png' })
  avatar!: string;

  @ApiProperty({ example: '', description: '个性签名' })
  bio!: string;

  @ApiProperty({
    example: '65f1c2e4a1b2c3d4e5f6788a',
    nullable: true,
    description: '绑定伴侣的用户 id，未绑定为 null',
  })
  partnerId!: string | null;
}

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
