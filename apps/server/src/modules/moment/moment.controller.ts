import {
  BadRequestException,
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Post,
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
import { CreateMomentDto } from './dto/create-moment.dto';
import { ListMomentsQueryDto } from './dto/list-moments.query.dto';
import { MomentActionResultDto, MomentDto, MomentListDto } from './dto/moment.dto';
import { MomentService } from './moment.service';

@ApiTags('日常动态')
@Controller('moments')
@UseGuards(JwtAccessGuard)
@ApiBearerAuth('access-token')
export class MomentController {
  constructor(
    private readonly momentService: MomentService,
    private readonly userService: UserService,
  ) {}

  @Post()
  @HttpCode(HttpStatus.OK)
  // 限流：每分钟最多 20 条发布，防刷
  @Throttle({ default: { ttl: 60_000, limit: 20 } })
  @ApiOperation({
    summary: '发布一条动态',
    description:
      '`text` (0~500) 与 `images` (0~9 个 /static/... 或 http(s)://URL) 至少填一个。图片先调 `POST /upload/image` 拿到 `url` 再填。',
  })
  @ApiBody({ type: CreateMomentDto })
  @ApiOkResponse({ type: ApiResponseOf(MomentDto) })
  async create(
    @CurrentUser() auth: AuthUser,
    @Body() dto: CreateMomentDto,
  ): Promise<MomentDto> {
    const hasText = !!dto.text && dto.text.trim().length > 0;
    const hasImages = Array.isArray(dto.images) && dto.images.length > 0;
    if (!hasText && !hasImages) {
      throw new BadRequestException({
        message: 'text 与 images 不能同时为空',
        errorKey: ErrorKey.E_VALIDATION,
      });
    }
    return this.momentService.create(auth.userId, dto);
  }

  @Get()
  @ApiOperation({
    summary: '二人共享时间轴（分页）',
    description:
      '按 createdAt 倒序返回"我 + partner"的动态。`cursor` 透传上一页返回的 `nextCursor` 即可；`nextCursor = null` 表示已到底。',
  })
  @ApiOkResponse({ type: ApiResponseOf(MomentListDto) })
  async list(
    @CurrentUser() auth: AuthUser,
    @Query() query: ListMomentsQueryDto,
  ): Promise<MomentListDto> {
    const me = await this.userService.findById(auth.userId);
    if (!me) {
      throw new UnauthorizedException({
        message: '用户不存在',
        errorKey: ErrorKey.E_AUTH_INVALID,
      });
    }
    const partnerId = me.partnerId ? String(me.partnerId) : null;
    return this.momentService.listFeed(auth.userId, partnerId, query.cursor, query.limit);
  }

  @Delete(':id')
  @ApiOperation({
    summary: '删除自己发的一条动态',
    description: '软删（记 deletedAt）；非本人将返回 E_MOMENT_FORBIDDEN，不存在返回 E_MOMENT_NOT_FOUND。',
  })
  @ApiParam({ name: 'id', example: '65f2a1b3c4d5e6f7a8b9c0d1' })
  @ApiOkResponse({ type: ApiResponseOf(MomentActionResultDto) })
  async remove(
    @CurrentUser() auth: AuthUser,
    @Param('id') id: string,
  ): Promise<MomentActionResultDto> {
    await this.momentService.remove(auth.userId, id);
    return { ok: true };
  }
}
