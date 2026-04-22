import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { ErrorKey } from '../../common/constants/error-keys';
import { toDate, toIsoString } from '../../common/utils/date';
import { UserService } from '../user/user.service';
import type { UserDocument } from '../user/schemas/user.schema';
import { CreateMomentDto } from './dto/create-moment.dto';
import { MomentAuthorDto, MomentDto } from './dto/moment.dto';
import { Moment, MomentDocument } from './schemas/moment.schema';

const DEFAULT_LIMIT = 20;

@Injectable()
export class MomentService {
  constructor(
    @InjectModel(Moment.name) private readonly momentModel: Model<MomentDocument>,
    private readonly userService: UserService,
  ) {}

  async create(authorId: string, dto: CreateMomentDto): Promise<MomentDto> {
    const text = (dto.text ?? '').trim();
    const images = dto.images ?? [];
    // 「至少一项非空」做不到放 DTO 里优雅校验，Controller 层已拦一次，
    // 这里兜底防御直调 service 的路径（测试 / 内部调用）。
    if (!text && images.length === 0) {
      throw new BadRequestException({
        message: 'text 与 images 不能同时为空',
        errorKey: ErrorKey.E_VALIDATION,
      });
    }

    const doc = await this.momentModel.create({
      authorId: new Types.ObjectId(authorId),
      text,
      images,
    });

    const authorMap = await this.loadAuthorMap([doc.authorId]);
    return this.toDto(doc, authorMap);
  }

  /**
   * 二人时间轴分页：按 (createdAt desc, _id desc) 游标分页。
   * - 若当前用户未绑定 partner，只会查到自己的动态（降级）。
   */
  async listFeed(
    userId: string,
    partnerId: string | null,
    cursor: string | undefined,
    limit: number = DEFAULT_LIMIT,
  ): Promise<{ items: MomentDto[]; nextCursor: string | null }> {
    const authorIds: Types.ObjectId[] = [new Types.ObjectId(userId)];
    if (partnerId) authorIds.push(new Types.ObjectId(partnerId));

    // Mongoose 9 不再显式导出 FilterQuery 类型，这里用裸对象配合 find 的参数宽松类型。
    const query: Record<string, unknown> = {
      authorId: { $in: authorIds },
      deletedAt: null,
    };

    if (cursor) {
      const parsed = parseCursor(cursor);
      if (parsed) {
        query.$or = [
          { createdAt: { $lt: parsed.ts } },
          { createdAt: parsed.ts, _id: { $lt: parsed.id } },
        ];
      }
    }

    const rows = await this.momentModel
      .find(query)
      .sort({ createdAt: -1, _id: -1 })
      .limit(limit + 1)
      .exec();

    const hasMore = rows.length > limit;
    const items = hasMore ? rows.slice(0, limit) : rows;

    const authorMap = await this.loadAuthorMap(items.map((m) => m.authorId));
    const dtoItems = items.map((m) => this.toDto(m, authorMap));

    const last = items[items.length - 1];
    const nextCursor = hasMore && last
      ? makeCursor(toDate(last.createdAt), last._id as Types.ObjectId)
      : null;

    return { items: dtoItems, nextCursor };
  }

  /** 软删。只允许作者本人删除。 */
  async remove(userId: string, momentId: string): Promise<void> {
    if (!Types.ObjectId.isValid(momentId)) {
      throw new NotFoundException({
        message: '动态不存在',
        errorKey: ErrorKey.E_MOMENT_NOT_FOUND,
      });
    }
    const doc = await this.momentModel.findById(momentId).exec();
    if (!doc || doc.deletedAt) {
      throw new NotFoundException({
        message: '动态不存在',
        errorKey: ErrorKey.E_MOMENT_NOT_FOUND,
      });
    }
    if (String(doc.authorId) !== userId) {
      throw new ForbiddenException({
        message: '只能删除自己发的动态',
        errorKey: ErrorKey.E_MOMENT_FORBIDDEN,
      });
    }
    doc.deletedAt = new Date();
    await doc.save();
  }

  // ---------- private ----------

  private async loadAuthorMap(
    ids: Types.ObjectId[],
  ): Promise<Map<string, UserDocument>> {
    const uniq = Array.from(new Set(ids.map((i) => String(i))));
    const users = await this.userService.findManyBrief(uniq);
    return new Map(users.map((u) => [String(u._id), u]));
  }

  private toDto(m: MomentDocument, authorMap: Map<string, UserDocument>): MomentDto {
    const author = authorMap.get(String(m.authorId));
    const authorDto: MomentAuthorDto = author
      ? {
          id: String(author._id),
          username: author.username,
          nickname: author.nickname,
          avatar: author.avatar,
        }
      : {
          id: String(m.authorId),
          username: '',
          nickname: '(未知用户)',
          avatar: '',
        };
    return {
      id: String(m._id),
      author: authorDto,
      text: m.text,
      images: m.images,
      createdAt: toIsoString(m.createdAt),
    };
  }
}

// ---------- cursor helpers ----------

function makeCursor(createdAt: Date, id: Types.ObjectId): string {
  return `${createdAt.getTime()}_${id.toHexString()}`;
}

function parseCursor(raw: string): { ts: Date; id: Types.ObjectId } | null {
  const m = /^(\d+)_([a-fA-F0-9]{24})$/.exec(raw);
  if (!m) return null;
  return { ts: new Date(Number(m[1])), id: new Types.ObjectId(m[2]) };
}
