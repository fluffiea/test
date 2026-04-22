import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
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
}
