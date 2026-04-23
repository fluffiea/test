import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import type {
  EvaluationDto,
  PostAuthorDto,
  PostDto,
  PostListDto,
  PostType,
  ReportFilter,
} from '@momoya/shared';
import {
  DAILY_TAG_MAX_PER_POST,
  POST_IMAGE_MAX,
  POST_TEXT_MAX,
  REPORT_TAG_MAX,
  REPORT_TAG_MIN,
  TAG_NAME_MAX,
} from '@momoya/shared';
import { ErrorKey } from '../../common/constants/error-keys';
import { toDate, toIsoString } from '../../common/utils/date';
import { TagService } from '../tag/tag.service';
import { UserService } from '../user/user.service';
import type { UserDocument } from '../user/schemas/user.schema';
import { CreatePostDto } from './dto/create-post.dto';
import { ListPostsQueryDto } from './dto/list-posts.query.dto';
import { UpdatePostDto } from './dto/update-post.dto';
import { Evaluation, EvaluationDocument } from './schemas/evaluation.schema';
import { Post, PostDocument } from './schemas/post.schema';

const DEFAULT_LIMIT = 20;

@Injectable()
export class PostService {
  constructor(
    @InjectModel(Post.name) private readonly postModel: Model<PostDocument>,
    @InjectModel(Evaluation.name)
    private readonly evaluationModel: Model<EvaluationDocument>,
    private readonly userService: UserService,
    private readonly tagService: TagService,
  ) {}

  async create(authorId: string, dto: CreatePostDto): Promise<PostDto> {
    const text = (dto.text ?? '').trim();
    const images = (dto.images ?? []).slice(0, POST_IMAGE_MAX);
    const tags = dedupeTags(dto.tags ?? []);

    if (text.length > POST_TEXT_MAX) {
      throw new BadRequestException({
        message: `text 超长（上限 ${POST_TEXT_MAX}）`,
        errorKey: ErrorKey.E_VALIDATION,
      });
    }

    this.validateTags(dto.type, tags);
    await this.ensureReportTagsAllowed(authorId, dto.type, tags);

    if (!text && images.length === 0) {
      throw new BadRequestException({
        message: 'text 与 images 不能同时为空',
        errorKey: ErrorKey.E_VALIDATION,
      });
    }

    const happenedAt = dto.happenedAt ? new Date(dto.happenedAt) : new Date();

    const doc = await this.postModel.create({
      authorId: new Types.ObjectId(authorId),
      type: dto.type,
      text,
      images,
      tags,
      happenedAt,
    });

    const authorMap = await this.loadAuthorMap([doc.authorId]);
    return this.toDto(doc, authorMap, null);
  }

  async update(
    authorId: string,
    postId: string,
    dto: UpdatePostDto,
  ): Promise<PostDto> {
    const doc = await this.mustFindOwnPost(authorId, postId);

    const next: Partial<Pick<Post, 'text' | 'images' | 'tags' | 'happenedAt'>> =
      {};
    if (dto.text !== undefined) {
      const text = dto.text.trim();
      if (text.length > POST_TEXT_MAX) {
        throw new BadRequestException({
          message: `text 超长（上限 ${POST_TEXT_MAX}）`,
          errorKey: ErrorKey.E_VALIDATION,
        });
      }
      next.text = text;
    }
    if (dto.images !== undefined) {
      next.images = dto.images.slice(0, POST_IMAGE_MAX);
    }
    if (dto.tags !== undefined) {
      const tags = dedupeTags(dto.tags);
      this.validateTags(doc.type, tags);
      await this.ensureReportTagsAllowed(authorId, doc.type, tags);
      next.tags = tags;
    }
    if (dto.happenedAt !== undefined) {
      next.happenedAt = new Date(dto.happenedAt);
    }

    const mergedText = next.text ?? doc.text;
    const mergedImages = next.images ?? doc.images;
    if (!mergedText.trim() && mergedImages.length === 0) {
      throw new BadRequestException({
        message: 'text 与 images 不能同时为空',
        errorKey: ErrorKey.E_VALIDATION,
      });
    }

    if (Object.keys(next).length > 0) {
      Object.assign(doc, next);
      await doc.save();
    }

    const authorMap = await this.loadAuthorMap([doc.authorId]);
    const evaluation = await this.loadEvaluation(String(doc._id));
    return this.toDto(doc, authorMap, evaluation);
  }

  async detail(
    userId: string,
    postId: string,
    partnerId: string | null,
  ): Promise<PostDto> {
    const doc = await this.mustFindVisiblePost(userId, partnerId, postId);
    const authorMap = await this.loadAuthorMap([doc.authorId]);
    const evaluation = await this.loadEvaluation(String(doc._id));
    return this.toDto(doc, authorMap, evaluation);
  }

  /**
   * Feed 分页。
   * - type='daily'：always 返回 me + partner（若有）的日常；
   * - type='report'：
   *   - filter='all'：me + partner；
   *   - filter='unread'：仅 partner 发给 me、readAt=null（没有 partner 则返回空）；
   *   - filter='mine'：仅 me 自己发的。
   */
  async list(
    userId: string,
    partnerId: string | null,
    query: ListPostsQueryDto,
  ): Promise<PostListDto> {
    const limit = query.limit ?? DEFAULT_LIMIT;
    const filter: ReportFilter = query.filter ?? 'all';

    const authorFilter = this.buildAuthorFilter(
      userId,
      partnerId,
      query.type,
      filter,
    );
    if (!authorFilter) {
      // 比如 report + unread 但没有 partner，直接空返
      return { items: [], nextCursor: null };
    }

    const mongo: Record<string, unknown> = {
      type: query.type,
      deletedAt: null,
      ...authorFilter,
    };
    if (query.type === 'report' && filter === 'unread') {
      mongo.readAt = null;
    }

    if (query.cursor) {
      const parsed = parseCursor(query.cursor);
      if (parsed) {
        mongo.$or = [
          { happenedAt: { $lt: parsed.ts } },
          { happenedAt: parsed.ts, _id: { $lt: parsed.id } },
        ];
      }
    }

    const rows = await this.postModel
      .find(mongo)
      .sort({ happenedAt: -1, _id: -1 })
      .limit(limit + 1)
      .exec();

    const hasMore = rows.length > limit;
    const items = hasMore ? rows.slice(0, limit) : rows;

    const authorMap = await this.loadAuthorMap(items.map((p) => p.authorId));
    const evalMap = await this.loadEvaluationMap(items.map((p) => p._id));

    const dtoItems = items.map((p) =>
      this.toDto(p, authorMap, evalMap.get(String(p._id)) ?? null),
    );

    const last = items[items.length - 1];
    const nextCursor =
      hasMore && last ? makeCursor(toDate(last.happenedAt), last._id) : null;

    return { items: dtoItems, nextCursor };
  }

  async remove(userId: string, postId: string): Promise<void> {
    const doc = await this.mustFindOwnPost(userId, postId);
    doc.deletedAt = new Date();
    await doc.save();
  }

  /** 标记报备为已阅。仅 partner（非作者）可调；已阅不重复打点。 */
  async markRead(
    userId: string,
    partnerId: string | null,
    postId: string,
  ): Promise<Date> {
    const doc = await this.mustFindVisiblePost(userId, partnerId, postId);
    if (doc.type !== 'report') {
      throw new BadRequestException({
        message: '仅报备可以标记已阅',
        errorKey: ErrorKey.E_POST_TYPE_MISMATCH,
      });
    }
    if (String(doc.authorId) === userId) {
      throw new ForbiddenException({
        message: '不能标记自己发的报备',
        errorKey: ErrorKey.E_POST_FORBIDDEN,
      });
    }
    if (!doc.readAt) {
      doc.readAt = new Date();
      await doc.save();
    }
    return doc.readAt;
  }

  // ---------- helpers：给其他 Service 用 ----------

  /** 取 post 文档（不带 DTO 转换），供 EvaluationService 做权限判断。 */
  async findVisiblePostDoc(
    userId: string,
    partnerId: string | null,
    postId: string,
  ): Promise<PostDocument> {
    return this.mustFindVisiblePost(userId, partnerId, postId);
  }

  // ---------- private ----------

  private validateTags(type: PostType, tags: string[]): void {
    for (const t of tags) {
      if (!t || t.length > TAG_NAME_MAX) {
        throw new BadRequestException({
          message: `tag 长度应为 1~${TAG_NAME_MAX}`,
          errorKey: ErrorKey.E_VALIDATION,
        });
      }
    }
    if (type === 'daily' && tags.length > DAILY_TAG_MAX_PER_POST) {
      throw new BadRequestException({
        message: `日常 tag 数量不得超过 ${DAILY_TAG_MAX_PER_POST}`,
        errorKey: ErrorKey.E_VALIDATION,
      });
    }
    if (type === 'report') {
      if (tags.length < REPORT_TAG_MIN) {
        throw new BadRequestException({
          message: `报备至少需要 ${REPORT_TAG_MIN} 个 tag`,
          errorKey: ErrorKey.E_VALIDATION,
        });
      }
      if (tags.length > REPORT_TAG_MAX) {
        throw new BadRequestException({
          message: `报备 tag 数量不得超过 ${REPORT_TAG_MAX}`,
          errorKey: ErrorKey.E_VALIDATION,
        });
      }
    }
  }

  private async ensureReportTagsAllowed(
    userId: string,
    type: PostType,
    tags: string[],
  ): Promise<void> {
    if (type !== 'report') return;
    await this.tagService.validateReportTags(userId, tags);
  }

  private buildAuthorFilter(
    userId: string,
    partnerId: string | null,
    type: PostType,
    filter: ReportFilter,
  ): Record<string, unknown> | null {
    const me = new Types.ObjectId(userId);
    const partner = partnerId ? new Types.ObjectId(partnerId) : null;

    if (type === 'report') {
      if (filter === 'unread') {
        if (!partner) return null;
        return { authorId: partner };
      }
      if (filter === 'mine') {
        return { authorId: me };
      }
    }

    // daily 或 report-all
    const ids: Types.ObjectId[] = partner ? [me, partner] : [me];
    return { authorId: { $in: ids } };
  }

  private async mustFindOwnPost(
    userId: string,
    postId: string,
  ): Promise<PostDocument> {
    if (!Types.ObjectId.isValid(postId)) {
      throw new NotFoundException({
        message: '内容不存在',
        errorKey: ErrorKey.E_POST_NOT_FOUND,
      });
    }
    const doc = await this.postModel.findById(postId).exec();
    if (!doc || doc.deletedAt) {
      throw new NotFoundException({
        message: '内容不存在',
        errorKey: ErrorKey.E_POST_NOT_FOUND,
      });
    }
    if (String(doc.authorId) !== userId) {
      throw new ForbiddenException({
        message: '只能操作自己发的内容',
        errorKey: ErrorKey.E_POST_FORBIDDEN,
      });
    }
    return doc;
  }

  private async mustFindVisiblePost(
    userId: string,
    partnerId: string | null,
    postId: string,
  ): Promise<PostDocument> {
    if (!Types.ObjectId.isValid(postId)) {
      throw new NotFoundException({
        message: '内容不存在',
        errorKey: ErrorKey.E_POST_NOT_FOUND,
      });
    }
    const doc = await this.postModel.findById(postId).exec();
    if (!doc || doc.deletedAt) {
      throw new NotFoundException({
        message: '内容不存在',
        errorKey: ErrorKey.E_POST_NOT_FOUND,
      });
    }
    const ownerId = String(doc.authorId);
    if (ownerId !== userId && ownerId !== partnerId) {
      throw new ForbiddenException({
        message: '无权查看',
        errorKey: ErrorKey.E_POST_FORBIDDEN,
      });
    }
    return doc;
  }

  private async loadAuthorMap(
    ids: Types.ObjectId[],
  ): Promise<Map<string, UserDocument>> {
    const uniq = Array.from(new Set(ids.map((i) => String(i))));
    const users = await this.userService.findManyBrief(uniq);
    return new Map(users.map((u) => [String(u._id), u]));
  }

  private async loadEvaluation(postId: string): Promise<EvaluationDto | null> {
    if (!Types.ObjectId.isValid(postId)) return null;
    const doc = await this.evaluationModel
      .findOne({ postId: new Types.ObjectId(postId) })
      .exec();
    return doc ? this.toEvaluationDto(doc) : null;
  }

  private async loadEvaluationMap(
    postIds: Types.ObjectId[],
  ): Promise<Map<string, EvaluationDto>> {
    if (postIds.length === 0) return new Map();
    const docs = await this.evaluationModel
      .find({ postId: { $in: postIds } })
      .exec();
    return new Map(
      docs.map((d) => [String(d.postId), this.toEvaluationDto(d)]),
    );
  }

  private toEvaluationDto(doc: EvaluationDocument): EvaluationDto {
    return {
      id: String(doc._id),
      postId: String(doc.postId),
      authorId: String(doc.authorId),
      text: doc.text,
      createdAt: toIsoString(doc.createdAt),
      updatedAt: toIsoString(doc.updatedAt),
    };
  }

  private toDto(
    p: PostDocument,
    authorMap: Map<string, UserDocument>,
    evaluation: EvaluationDto | null,
  ): PostDto {
    const author = authorMap.get(String(p.authorId));
    const authorDto: PostAuthorDto = author
      ? {
          id: String(author._id),
          username: author.username,
          nickname: author.nickname,
          avatar: author.avatar,
        }
      : {
          id: String(p.authorId),
          username: '',
          nickname: '(未知用户)',
          avatar: '',
        };
    return {
      id: String(p._id),
      type: p.type,
      author: authorDto,
      text: p.text,
      images: p.images,
      tags: p.tags,
      happenedAt: toIsoString(p.happenedAt),
      createdAt: toIsoString(p.createdAt),
      updatedAt: toIsoString(p.updatedAt),
      readAt: p.readAt ? toIsoString(p.readAt) : null,
      evaluation,
    };
  }
}

// ---------- tag helpers ----------

/** 去空白 / 去空 / 去重（保持首次出现顺序）。 */
function dedupeTags(tags: string[]): string[] {
  const out: string[] = [];
  const seen = new Set<string>();
  for (const raw of tags) {
    const t = (raw ?? '').trim();
    if (!t) continue;
    if (seen.has(t)) continue;
    seen.add(t);
    out.push(t);
  }
  return out;
}

// ---------- cursor helpers ----------

function makeCursor(happenedAt: Date, id: Types.ObjectId): string {
  return `${happenedAt.getTime()}_${id.toHexString()}`;
}

function parseCursor(raw: string): { ts: Date; id: Types.ObjectId } | null {
  const m = /^(\d+)_([a-fA-F0-9]{24})$/.exec(raw);
  if (!m) return null;
  return { ts: new Date(Number(m[1])), id: new Types.ObjectId(m[2]) };
}
