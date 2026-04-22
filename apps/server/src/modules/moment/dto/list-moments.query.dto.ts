import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsInt, IsOptional, IsString, Matches, Max, Min } from 'class-validator';
import type { ListMomentsQueryDto as ListMomentsShape } from '@momoya/shared';

/**
 * 时间轴列表 query。cursor 由后端生成返回给前端，前端透传下一页。
 * 形如 `<createdAtEpochMs>_<objectIdHex>`，如 `1745423400000_65f2a1b3c4d5e6f7a8b9c0d1`。
 */
export class ListMomentsQueryDto implements ListMomentsShape {
  @ApiPropertyOptional({
    description: '下一页游标，首屏省略即可',
    example: '1745423400000_65f2a1b3c4d5e6f7a8b9c0d1',
  })
  @IsOptional()
  @IsString()
  @Matches(/^\d+_[a-fA-F0-9]{24}$/, {
    message: 'cursor 格式应为 <epochMs>_<objectId>',
  })
  cursor?: string;

  @ApiPropertyOptional({ minimum: 1, maximum: 50, default: 20 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(50)
  limit?: number;
}
