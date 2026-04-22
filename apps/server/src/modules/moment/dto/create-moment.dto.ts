import { ApiProperty } from '@nestjs/swagger';
import {
  ArrayMaxSize,
  IsArray,
  IsOptional,
  IsString,
  Matches,
  MaxLength,
} from 'class-validator';
import type { CreateMomentInputDto } from '@momoya/shared';
import {
  ASSET_URL_PATTERN,
  MOMENT_IMAGE_MAX,
  MOMENT_TEXT_MAX,
} from '@momoya/shared';

/**
 * 「text 与 images 不能同时为空」这类跨字段的业务规则不放在 DTO 上，
 * 而是在 Controller 里显式校验，避免在 whitelist 模式下混入虚拟字段导致误判。
 */
export class CreateMomentDto implements CreateMomentInputDto {
  @ApiProperty({
    required: false,
    default: '',
    maxLength: MOMENT_TEXT_MAX,
    description: `文本内容，最多 ${MOMENT_TEXT_MAX} 字；text 与 images 不能同时为空。`,
    example: '今天和对象去吃了她一直想去的那家日料',
  })
  @IsOptional()
  @IsString()
  @MaxLength(MOMENT_TEXT_MAX)
  text?: string;

  @ApiProperty({
    required: false,
    type: [String],
    maxItems: MOMENT_IMAGE_MAX,
    description:
      `图片列表，元素为 /static/... 相对路径或 http(s):// 完整 URL；最多 ${MOMENT_IMAGE_MAX} 张；` +
      `text 与 images 不能同时为空。`,
    example: ['/static/2026/04/a.jpg', '/static/2026/04/b.jpg'],
  })
  @IsOptional()
  @IsArray()
  @ArrayMaxSize(MOMENT_IMAGE_MAX)
  @IsString({ each: true })
  @Matches(ASSET_URL_PATTERN, {
    each: true,
    message: 'images 每一项必须是 /static/ 相对路径或 http(s):// 完整 URL',
  })
  @MaxLength(500, { each: true })
  images?: string[];
}
