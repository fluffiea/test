import { ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsOptional,
  IsString,
  Matches,
  MaxLength,
  MinLength,
} from 'class-validator';

/**
 * PATCH /users/me 请求体。全部字段可选，但至少传一项才有意义
 * （ValidationPipe 的 whitelist 已拦截未知字段，空对象会被放行但 service 里会直接返回当前 me）。
 */
export class UpdateMeDto {
  @ApiPropertyOptional({
    example: '匠匠',
    minLength: 1,
    maxLength: 20,
    description: '昵称；1-20 字符，支持中英文数字',
  })
  @IsOptional()
  @IsString()
  @MinLength(1, { message: '昵称不能为空' })
  @MaxLength(20, { message: '昵称最长 20 字符' })
  nickname?: string;

  @ApiPropertyOptional({
    example: '喜欢阳光和猫猫',
    maxLength: 100,
    description: '个性签名；0-100 字符，允许空串',
  })
  @IsOptional()
  @IsString()
  @MaxLength(100, { message: '签名最长 100 字符' })
  bio?: string;

  @ApiPropertyOptional({
    example: '/static/2026/04/3f3b8b9a.webp',
    description:
      '头像 URL：必须是 `/static/` 开头的相对路径（来自 POST /upload/image），或 http(s)://… 完整 URL',
  })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  @Matches(/^(\/static\/|https?:\/\/)/, {
    message: 'avatar 必须是 /static/ 相对路径或 http(s):// 完整 URL',
  })
  avatar?: string;
}
