import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { Post, PostSchema } from '../modules/post/schemas/post.schema';
import { UserModule } from '../modules/user/user.module';
import { SeedService } from './seed.service';

@Module({
  imports: [
    UserModule,
    MongooseModule.forFeature([{ name: Post.name, schema: PostSchema }]),
  ],
  providers: [SeedService],
})
export class SeedModule {}
