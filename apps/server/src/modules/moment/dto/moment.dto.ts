import { ApiProperty } from '@nestjs/swagger';
import type {
  MomentActionResultDto as MomentActionResultShape,
  MomentAuthorDto as MomentAuthorShape,
  MomentDto as MomentShape,
  MomentListDto as MomentListShape,
} from '@momoya/shared';
import { MOMENT_TEXT_MAX } from '@momoya/shared';

/** 动态里的作者简要信息（不暴露 bio / partnerId 等） */
export class MomentAuthorDto implements MomentAuthorShape {
  @ApiProperty({ example: '65f1c2e4a1b2c3d4e5f67890' })
  id!: string;

  @ApiProperty({ example: 'jiangjiang' })
  username!: string;

  @ApiProperty({ example: '匠匠' })
  nickname!: string;

  @ApiProperty({
    example: '/static/2026/04/avatar.png',
    description: '头像，空串表示默认占位',
  })
  avatar!: string;
}

export class MomentDto implements MomentShape {
  @ApiProperty({ example: '65f2a1b3c4d5e6f7a8b9c0d1' })
  id!: string;

  @ApiProperty({ type: MomentAuthorDto })
  author!: MomentAuthorDto;

  @ApiProperty({
    example: '今天一起吃了日料',
    description: `0~${MOMENT_TEXT_MAX} 字`,
  })
  text!: string;

  @ApiProperty({
    type: [String],
    example: ['/static/2026/04/a.jpg', '/static/2026/04/b.jpg'],
    description: '相对路径或完整 URL；前端需自行 resolveAssetUrl 后展示',
  })
  images!: string[];

  @ApiProperty({ example: '2026-04-22T23:30:00.000Z' })
  createdAt!: string;
}

export class MomentListDto implements MomentListShape {
  @ApiProperty({ type: [MomentDto] })
  items!: MomentDto[];

  @ApiProperty({
    nullable: true,
    example: '1745423400000_65f2a1b3c4d5e6f7a8b9c0d1',
    description: '下一页 cursor；为 null 表示已到底',
  })
  nextCursor!: string | null;
}

export class MomentActionResultDto implements MomentActionResultShape {
  @ApiProperty({ example: true })
  ok!: true;
}
