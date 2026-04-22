import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, Schema as MongooseSchema, Types } from 'mongoose';

export type MomentDocument = HydratedDocument<Moment>;

/**
 * 「日常动态」collection。设计原则：
 * - 不显式存 coupleId：双人可见通过 `authorId ∈ {me, partnerId}` 过滤即可（MVP 单对情侣）。
 * - 软删：deletedAt 非空即视为已删，列表查询统一过滤。
 * - images 只存 `/static/...` 相对路径（或完整 URL），由前端 resolveAssetUrl 拼绝对地址。
 */
@Schema({ collection: 'moments', timestamps: true })
export class Moment {
  @Prop({ type: MongooseSchema.Types.ObjectId, ref: 'User', required: true, index: true })
  authorId!: Types.ObjectId;

  @Prop({ type: String, required: true, default: '' })
  text!: string;

  @Prop({ type: [String], default: [] })
  images!: string[];

  @Prop({ type: Date, default: null, index: true })
  deletedAt!: Date | null;

  // 由 { timestamps: true } 自动维护，这里声明类型仅用于 TS 推断，不需要 @Prop
  createdAt!: Date;
  updatedAt!: Date;
}

export const MomentSchema = SchemaFactory.createForClass(Moment);

// 列表查询主索引：按作者过滤 + 按时间倒序
MomentSchema.index({ authorId: 1, createdAt: -1 });
// Cursor 分页辅助索引：(createdAt, _id) 组合 desc
MomentSchema.index({ createdAt: -1, _id: -1 });
