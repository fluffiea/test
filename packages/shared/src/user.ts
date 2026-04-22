/** 当前登录用户的基本信息，`GET /auth/me`、`PATCH /users/me` 都返回这个结构。 */
export interface MeDto {
  /** 用户 ObjectId 字符串 */
  id: string;
  username: string;
  nickname: string;
  /** 头像；空串表示使用前端默认占位，否则为 /static/... 相对路径或完整 URL */
  avatar: string;
  bio: string;
  /** 绑定伴侣的用户 id，未绑定为 null */
  partnerId: string | null;
}

/** Partner 的简要公开信息，用于时间轴顶部的「双人关系卡片」。 */
export interface PartnerBriefDto {
  id: string;
  username: string;
  nickname: string;
  avatar: string;
  /** 账号创建时间，用于计算「在一起多少天」 */
  createdAt: string;
}

/** PATCH /users/me 请求体，字段均可选。 */
export interface UpdateMeInput {
  nickname?: string;
  bio?: string;
  avatar?: string;
}
