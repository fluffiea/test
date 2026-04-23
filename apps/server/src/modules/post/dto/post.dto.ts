import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import type {
  EvaluationDto as EvaluationShape,
  MarkReadResultDto as MarkReadShape,
  PostActionResultDto as PostActionShape,
  PostAuthorDto as PostAuthorShape,
  PostDto as PostShape,
  PostListDto as PostListShape,
  PostType,
} from '@momoya/shared';
import { POST_TEXT_MAX } from '@momoya/shared';

export class PostAuthorDto implements PostAuthorShape {
  @ApiProperty({ example: '65f1c2e4a1b2c3d4e5f67890' })
  id!: string;

  @ApiProperty({ example: 'jiangjiang' })
  username!: string;

  @ApiProperty({ example: '匠匠' })
  nickname!: string;

  @ApiProperty({ example: '/static/2026/04/avatar.png' })
  avatar!: string;
}

/** 评价的 Swagger 表示，此 DTO 仅用作内联返回；真正的 service 类型由 shared 约束。 */
export class EvaluationViewDto implements EvaluationShape {
  @ApiProperty({ example: '65fa7b3c4d5e6f7a8b9c0d1e' })
  id!: string;

  @ApiProperty({ example: '65f2a1b3c4d5e6f7a8b9c0d1' })
  postId!: string;

  @ApiProperty({ example: '65f1c2e4a1b2c3d4e5f67890' })
  authorId!: string;

  @ApiProperty({ example: '真乖，记得按时休息。' })
  text!: string;

  @ApiProperty({ example: '2026-04-22T23:35:00.000Z' })
  createdAt!: string;

  @ApiProperty({ example: '2026-04-22T23:40:00.000Z' })
  updatedAt!: string;
}

export class PostDto implements PostShape {
  @ApiProperty({ example: '65f2a1b3c4d5e6f7a8b9c0d1' })
  id!: string;

  @ApiProperty({ enum: ['daily', 'report'], example: 'daily' })
  type!: PostType;

  @ApiProperty({ type: PostAuthorDto })
  author!: PostAuthorDto;

  @ApiProperty({
    example: '今天和 TA 去吃了日料',
    description: `0~${POST_TEXT_MAX} 字`,
  })
  text!: string;

  @ApiProperty({ type: [String], example: ['/static/2026/04/a.jpg'] })
  images!: string[];

  @ApiProperty({ type: [String], example: ['吃饭', '约会'] })
  tags!: string[];

  @ApiProperty({
    example: '2026-04-22T18:30:00.000Z',
    description: '事件实际发生时间（默认 = createdAt）',
  })
  happenedAt!: string;

  @ApiProperty({ example: '2026-04-22T23:30:00.000Z' })
  createdAt!: string;

  @ApiProperty({ example: '2026-04-22T23:35:00.000Z' })
  updatedAt!: string;

  @ApiProperty({
    nullable: true,
    example: null,
    description: '仅 type=report 时有意义；partner 标记已阅的时间',
  })
  readAt!: string | null;

  @ApiPropertyOptional({ type: EvaluationViewDto, nullable: true })
  evaluation!: EvaluationShape | null;
}

export class PostListDto implements PostListShape {
  @ApiProperty({ type: [PostDto] })
  items!: PostDto[];

  @ApiProperty({
    nullable: true,
    example: '1745423400000_65f2a1b3c4d5e6f7a8b9c0d1',
    description: '下一页 cursor；为 null 表示已到底',
  })
  nextCursor!: string | null;
}

export class PostActionResultDto implements PostActionShape {
  @ApiProperty({ example: true })
  ok!: true;
}

export class MarkReadResultDto implements MarkReadShape {
  @ApiProperty({ example: '2026-04-22T23:40:00.000Z' })
  readAt!: string;
}
