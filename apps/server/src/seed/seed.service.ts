import { Injectable, Logger, OnApplicationBootstrap } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import * as bcrypt from 'bcrypt';
import { Model } from 'mongoose';
import { BCRYPT_ROUNDS } from '../common/constants/crypto';
import { User, UserDocument } from '../modules/user/schemas/user.schema';

interface SeedUser {
  username: string;
  password: string;
}

const INITIAL_USERS: SeedUser[] = [
  { username: 'jiangjiang', password: '251212' },
  { username: 'mengmeng', password: '251212' },
];

@Injectable()
export class SeedService implements OnApplicationBootstrap {
  private readonly logger = new Logger(SeedService.name);

  constructor(
    @InjectModel(User.name) private readonly userModel: Model<UserDocument>,
  ) {}

  async onApplicationBootstrap(): Promise<void> {
    const existing = await this.userModel.estimatedDocumentCount().exec();
    if (existing > 0) {
      this.logger.log('[seed] users exist, skipped');
      return;
    }

    const created: UserDocument[] = [];
    for (const seed of INITIAL_USERS) {
      const passwordHash = await bcrypt.hash(seed.password, BCRYPT_ROUNDS);
      const doc = await this.userModel.create({
        username: seed.username,
        nickname: seed.username,
        passwordHash,
      });
      created.push(doc);
    }

    if (created.length === 2) {
      const [a, b] = created;
      await this.userModel.updateOne({ _id: a._id }, { partnerId: b._id });
      await this.userModel.updateOne({ _id: b._id }, { partnerId: a._id });
    }

    this.logger.log(
      `[seed] created initial users: ${created.map((u) => u.username).join(', ')}`,
    );
  }
}
