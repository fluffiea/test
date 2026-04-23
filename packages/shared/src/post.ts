/**
 * Post 统一实体：日常（daily）与报备（report）共用一张表。
 *
 * - `type='daily'`：朋友圈式日常。`tags` 为自由输入、不与用户绑定。
 * - `type='report'`：向 partner 的日程报备。`tags` 必须 >=1，且来自 preset ∪ 本人 user_tags。
 *   `readAt` 由 partner 在详情页点"已阅"后打点；作者本人点无效。
 *
 * 评价（evaluation）作为独立实体存储在 `evaluations` 集合，详情接口里内联返回。
 */

import type { EvaluationDto } from './evaluation';

export type PostType = 'daily' | 'report';

export type ReportFilter = 'all' | 'unread' | 'mine';

export interface PostAuthorDto {
  id: string;
  username: string;
  nickname: string;
  avatar: string;
}

export interface PostDto {
  id: string;
  type: PostType;
  author: PostAuthorDto;

  /** 0~POST_TEXT_MAX 字 */
  text: string;
  /** 0~POST_IMAGE_MAX 张，元素为 /static/... 或 http(s):// */
  images: string[];
  /** 日常：自由输入；报备：来自 preset + user_tags */
  tags: string[];

  /** ISO 字符串，事件实际发生时间（默认 = createdAt） */
  happenedAt: string;
  /** ISO 字符串，作者发布时间 */
  createdAt: string;
  /** ISO 字符串，最后修改时间 */
  updatedAt: string;

  /** 仅 type='report' 有意义：partner 标记已阅的时间；null 表示未阅。daily 恒为 null。 */
  readAt: string | null;

  /** 详情返回时内联的评价（列表场景也返回，用于"评价数"或直接展示）。 */
  evaluation: EvaluationDto | null;
}

export interface CreatePostInputDto {
  type: PostType;
  text?: string;
  images?: string[];
  tags?: string[];
  /** ISO 字符串；不传则服务端以 createdAt 填充 */
  happenedAt?: string;
}

export interface UpdatePostInputDto {
  text?: string;
  images?: string[];
  tags?: string[];
  happenedAt?: string;
}

export interface PostListDto {
  items: PostDto[];
  /** 下一页 cursor；null 表示已到底 */
  nextCursor: string | null;
}

export interface ListPostsQueryDto {
  type: PostType;
  /** 仅 type='report' 有意义，其它类型忽略；默认 'all' */
  filter?: ReportFilter;
  cursor?: string;
  limit?: number;
}

export interface PostActionResultDto {
  ok: true;
}

export interface MarkReadResultDto {
  readAt: string;
}
