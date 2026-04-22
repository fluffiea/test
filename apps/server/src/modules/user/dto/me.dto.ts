import { ApiProperty } from '@nestjs/swagger';

/** 当前登录用户的基本信息，`GET /auth/me`、`PATCH /users/me` 都返回这个结构。 */
export class MeDto {
  @ApiProperty({ example: '65f1c2e4a1b2c3d4e5f67890', description: '用户 ObjectId 字符串' })
  id!: string;

  @ApiProperty({ example: 'jiangjiang' })
  username!: string;

  @ApiProperty({ example: '匠匠' })
  nickname!: string;

  @ApiProperty({
    example: '',
    description: '头像；空串表示使用前端默认占位，否则为 /static/... 相对路径或完整 URL',
  })
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
