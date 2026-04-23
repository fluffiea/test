import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { AuthModule } from '../auth/auth.module';
import { TagModule } from '../tag/tag.module';
import { UserModule } from '../user/user.module';
import { EvaluationService } from './evaluation.service';
import { PostController } from './post.controller';
import { PostService } from './post.service';
import { Evaluation, EvaluationSchema } from './schemas/evaluation.schema';
import { Post, PostSchema } from './schemas/post.schema';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: Post.name, schema: PostSchema },
      { name: Evaluation.name, schema: EvaluationSchema },
    ]),
    AuthModule,
    UserModule,
    TagModule,
  ],
  controllers: [PostController],
  providers: [PostService, EvaluationService],
})
export class PostModule {}
