import {
  BadRequestException,
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Patch,
  Post as HttpPost,
  Put,
  Query,
  UnauthorizedException,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiBody,
  ApiOkResponse,
  ApiOperation,
  ApiParam,
  ApiTags,
} from '@nestjs/swagger';
import { Throttle } from '@nestjs/throttler';
import { ErrorKey } from '../../common/constants/error-keys';
import { ApiResponseOf } from '../../common/dto/api-response.dto';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { JwtAccessGuard } from '../auth/guards/jwt-access.guard';
import type { AuthUser } from '../auth/types/jwt-payload';
import { UserService } from '../user/user.service';
import { CreatePostDto } from './dto/create-post.dto';
import { ListPostsQueryDto } from './dto/list-posts.query.dto';
import {
  EvaluationViewDto,
  MarkReadResultDto,
  PostActionResultDto,
  PostDto,
  PostListDto,
} from './dto/post.dto';
import { UpdatePostDto } from './dto/update-post.dto';
import { UpsertEvaluationDto } from './dto/upsert-evaluation.dto';
import { EvaluationService } from './evaluation.service';
import { PostService } from './post.service';

@ApiTags('日常 / 报备')
@Controller('posts')
@UseGuards(JwtAccessGuard)
@ApiBearerAuth('access-token')
export class PostController {
  constructor(
    private readonly postService: PostService,
    private readonly evaluationService: EvaluationService,
    private readonly userService: UserService,
  ) {}

  @HttpPost()
  @HttpCode(HttpStatus.OK)
  @Throttle({ default: { ttl: 60_000, limit: 20 } })
  @ApiOperation({
    summary: '发布一条 post（日常 / 报备）',
    description:
      'type=daily：text 与 images 至少一项非空；tags 自由输入，最多 10。' +
      'type=report：必须 1~10 个 tag，均须在 preset + 本人 user_tags 内。',
  })
  @ApiBody({ type: CreatePostDto })
  @ApiOkResponse({ type: ApiResponseOf(PostDto) })
  async create(
    @CurrentUser() auth: AuthUser,
    @Body() dto: CreatePostDto,
  ): Promise<PostDto> {
    const hasText = !!dto.text && dto.text.trim().length > 0;
    const hasImages = Array.isArray(dto.images) && dto.images.length > 0;
    if (!hasText && !hasImages) {
      throw new BadRequestException({
        message: 'text 与 images 不能同时为空',
        errorKey: ErrorKey.E_VALIDATION,
      });
    }
    return this.postService.create(auth.userId, dto);
  }

  @Get()
  @ApiOperation({
    summary: '分页列表',
    description:
      'type=daily：按 happenedAt 倒序返回 me + partner 的日常；' +
      'type=report：filter=all|unread|mine，unread 仅看 partner 未阅的报备。',
  })
  @ApiOkResponse({ type: ApiResponseOf(PostListDto) })
  async list(
    @CurrentUser() auth: AuthUser,
    @Query() query: ListPostsQueryDto,
  ): Promise<PostListDto> {
    const me = await this.userService.findById(auth.userId);
    if (!me) {
      throw new UnauthorizedException({
        message: '用户不存在',
        errorKey: ErrorKey.E_AUTH_INVALID,
      });
    }
    const partnerId = me.partnerId ? String(me.partnerId) : null;
    return this.postService.list(auth.userId, partnerId, query);
  }

  @Get(':id')
  @ApiOperation({ summary: '详情（含 evaluation 内联）' })
  @ApiParam({ name: 'id', example: '65f2a1b3c4d5e6f7a8b9c0d1' })
  @ApiOkResponse({ type: ApiResponseOf(PostDto) })
  async detail(
    @CurrentUser() auth: AuthUser,
    @Param('id') id: string,
  ): Promise<PostDto> {
    const me = await this.userService.findById(auth.userId);
    if (!me) {
      throw new UnauthorizedException({
        message: '用户不存在',
        errorKey: ErrorKey.E_AUTH_INVALID,
      });
    }
    const partnerId = me.partnerId ? String(me.partnerId) : null;
    return this.postService.detail(auth.userId, id, partnerId);
  }

  @Patch(':id')
  @ApiOperation({ summary: '编辑 post（仅作者）' })
  @ApiParam({ name: 'id', example: '65f2a1b3c4d5e6f7a8b9c0d1' })
  @ApiOkResponse({ type: ApiResponseOf(PostDto) })
  async update(
    @CurrentUser() auth: AuthUser,
    @Param('id') id: string,
    @Body() dto: UpdatePostDto,
  ): Promise<PostDto> {
    return this.postService.update(auth.userId, id, dto);
  }

  @Delete(':id')
  @ApiOperation({ summary: '软删 post（仅作者）' })
  @ApiParam({ name: 'id', example: '65f2a1b3c4d5e6f7a8b9c0d1' })
  @ApiOkResponse({ type: ApiResponseOf(PostActionResultDto) })
  async remove(
    @CurrentUser() auth: AuthUser,
    @Param('id') id: string,
  ): Promise<PostActionResultDto> {
    await this.postService.remove(auth.userId, id);
    return { ok: true };
  }

  @HttpPost(':id/read')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: '标记报备为已阅（仅 partner）',
    description: '仅 type=report 有意义；已阅不会重复打点。',
  })
  @ApiParam({ name: 'id', example: '65f2a1b3c4d5e6f7a8b9c0d1' })
  @ApiOkResponse({ type: ApiResponseOf(MarkReadResultDto) })
  async markRead(
    @CurrentUser() auth: AuthUser,
    @Param('id') id: string,
  ): Promise<MarkReadResultDto> {
    const me = await this.userService.findById(auth.userId);
    if (!me) {
      throw new UnauthorizedException({
        message: '用户不存在',
        errorKey: ErrorKey.E_AUTH_INVALID,
      });
    }
    const partnerId = me.partnerId ? String(me.partnerId) : null;
    const readAt = await this.postService.markRead(auth.userId, partnerId, id);
    return { readAt: readAt.toISOString() };
  }

  @Put(':id/evaluation')
  @ApiOperation({
    summary: 'UPSERT 评价（仅 partner，可修改不可删）',
    description: '一条 post 至多一条评价；再次调用覆盖文本。',
  })
  @ApiParam({ name: 'id', example: '65f2a1b3c4d5e6f7a8b9c0d1' })
  @ApiBody({ type: UpsertEvaluationDto })
  @ApiOkResponse({ type: ApiResponseOf(EvaluationViewDto) })
  async upsertEvaluation(
    @CurrentUser() auth: AuthUser,
    @Param('id') id: string,
    @Body() dto: UpsertEvaluationDto,
  ): Promise<EvaluationViewDto> {
    const me = await this.userService.findById(auth.userId);
    if (!me) {
      throw new UnauthorizedException({
        message: '用户不存在',
        errorKey: ErrorKey.E_AUTH_INVALID,
      });
    }
    const partnerId = me.partnerId ? String(me.partnerId) : null;
    const ev = await this.evaluationService.upsert(
      auth.userId,
      partnerId,
      id,
      dto.text,
    );
    return ev;
  }
}
