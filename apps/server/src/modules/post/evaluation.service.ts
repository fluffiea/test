import {
  BadRequestException,
  ForbiddenException,
  Injectable,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import type { EvaluationDto } from '@momoya/shared';
import { ErrorKey } from '../../common/constants/error-keys';
import { toIsoString } from '../../common/utils/date';
import { PostService } from './post.service';
import { Evaluation, EvaluationDocument } from './schemas/evaluation.schema';

@Injectable()
export class EvaluationService {
  constructor(
    @InjectModel(Evaluation.name)
    private readonly evaluationModel: Model<EvaluationDocument>,
    private readonly postService: PostService,
  ) {}

  /**
   * UPSERT 评价。
   *
   * 权限：
   * - 调用方必须是 post 作者的 partner（即 "TA 发给我的我才能评价"）；
   * - post 作者本人不能评价自己；
   * - partner 未绑定时直接拒；
   * 不可删除，但可反复修改。
   */
  async upsert(
    userId: string,
    partnerId: string | null,
    postId: string,
    text: string,
  ): Promise<EvaluationDto> {
    const trimmed = text.trim();
    if (!trimmed) {
      throw new BadRequestException({
        message: '评价内容不能为空',
        errorKey: ErrorKey.E_VALIDATION,
      });
    }
    if (!partnerId) {
      throw new ForbiddenException({
        message: '未绑定 partner，无法评价',
        errorKey: ErrorKey.E_EVAL_NO_PARTNER,
      });
    }

    const postDoc = await this.postService.findVisiblePostDoc(
      userId,
      partnerId,
      postId,
    );
    if (String(postDoc.authorId) === userId) {
      throw new ForbiddenException({
        message: '不能评价自己发的内容',
        errorKey: ErrorKey.E_EVAL_ONLY_PARTNER,
      });
    }
    if (String(postDoc.authorId) !== partnerId) {
      // 这种情况不应该发生（visible + 不是自己 ⇒ 必然是 partner），兜底防御
      throw new ForbiddenException({
        message: '仅能评价 partner 发布的内容',
        errorKey: ErrorKey.E_EVAL_ONLY_PARTNER,
      });
    }

    const pid = new Types.ObjectId(postId);
    const uid = new Types.ObjectId(userId);

    const doc = await this.evaluationModel
      .findOneAndUpdate(
        { postId: pid },
        { $set: { text: trimmed, authorId: uid } },
        { upsert: true, new: true, setDefaultsOnInsert: true },
      )
      .exec();

    return {
      id: String(doc._id),
      postId: String(doc.postId),
      authorId: String(doc.authorId),
      text: doc.text,
      createdAt: toIsoString(doc.createdAt),
      updatedAt: toIsoString(doc.updatedAt),
    };
  }
}
