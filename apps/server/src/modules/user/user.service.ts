import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { MeDto } from './dto/me.dto';
import { UpdateMeDto } from './dto/update-me.dto';
import { User, UserDocument } from './schemas/user.schema';

@Injectable()
export class UserService {
  constructor(
    @InjectModel(User.name) private readonly userModel: Model<UserDocument>,
  ) {}

  findByUsername(username: string) {
    return this.userModel.findOne({ username }).exec();
  }

  findById(id: string | Types.ObjectId) {
    return this.userModel.findById(id).exec();
  }

  countAll() {
    return this.userModel.estimatedDocumentCount().exec();
  }

  /** 登录/改密后刷新会话与在线时间。传 null 可清除 session（登出）。 */
  async updateSession(userId: Types.ObjectId | string, sessionId: string | null) {
    await this.userModel
      .updateOne(
        { _id: userId },
        { $set: { currentSessionId: sessionId, lastOnlineAt: new Date() } },
      )
      .exec();
  }

  async updatePassword(userId: Types.ObjectId | string, passwordHash: string) {
    await this.userModel
      .updateOne({ _id: userId }, { $set: { passwordHash } })
      .exec();
  }

  async touchOnline(userId: Types.ObjectId | string) {
    await this.userModel
      .updateOne({ _id: userId }, { $set: { lastOnlineAt: new Date() } })
      .exec();
  }

  /**
   * 部分更新 nickname / bio / avatar。
   * 返回更新后的完整 UserDocument；若没有任何字段要改则直接返回现状。
   */
  async updateProfile(
    userId: string | Types.ObjectId,
    dto: UpdateMeDto,
  ): Promise<UserDocument | null> {
    const $set: Partial<Pick<User, 'nickname' | 'bio' | 'avatar'>> = {};
    if (dto.nickname !== undefined) $set.nickname = dto.nickname;
    if (dto.bio !== undefined) $set.bio = dto.bio;
    if (dto.avatar !== undefined) $set.avatar = dto.avatar;

    if (Object.keys($set).length === 0) {
      return this.userModel.findById(userId).exec();
    }

    return this.userModel
      .findByIdAndUpdate(userId, { $set }, { new: true })
      .exec();
  }

  /** UserDocument → MeDto 的统一映射，避免多处散落。 */
  toMe(user: UserDocument): MeDto {
    return {
      id: String(user._id),
      username: user.username,
      nickname: user.nickname,
      avatar: user.avatar,
      bio: user.bio,
      partnerId: user.partnerId ? String(user.partnerId) : null,
    };
  }
}
