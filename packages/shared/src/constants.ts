/**
 * 领域常量：文本 / 图片 / 上传体积等。
 * 后端 DTO 与前端表单都应直接引用这里的字面量，避免各自写一份。
 */

/** 昵称长度（含） */
export const NICKNAME_MIN = 1;
export const NICKNAME_MAX = 20;

/** 个性签名长度（上限，允许空串） */
export const BIO_MAX = 100;

/** 密码长度（含） */
export const PASSWORD_MIN = 6;
export const PASSWORD_MAX = 64;

/**
 * 单条 post（日常 / 报备）的文本上限。
 * 历史名 `MOMENT_TEXT_MAX` 仍导出为等值别名，旧调用点逐步替换即可。
 */
export const POST_TEXT_MAX = 500;
/** @deprecated 使用 {@link POST_TEXT_MAX}。 */
export const MOMENT_TEXT_MAX = POST_TEXT_MAX;

/** 单条 post 最多几张图 */
export const POST_IMAGE_MAX = 9;
/** @deprecated 使用 {@link POST_IMAGE_MAX}。 */
export const MOMENT_IMAGE_MAX = POST_IMAGE_MAX;

// ---------- tags ----------

/**
 * 日常 post 的 tag：前端自由输入、按 `,`/`，` 分割入数组，不持久到独立集合，
 * 只和 post 一起存。单条 post 上 tag 的数量上限（避免滥用）。
 */
export const DAILY_TAG_MAX_PER_POST = 10;

/** 单个 tag 名称长度上限（字符数）。日常 / 报备共用。 */
export const TAG_NAME_MAX = 10;

/** 报备 post 的 tag：持久化在 user_tags（自定义）+ preset 合并，发布时从中勾选。 */
export const REPORT_TAG_MIN = 1;
export const REPORT_TAG_MAX = 10;

/** 每个用户最多可以持有多少个 custom 报备 tag。 */
export const USER_TAG_PER_USER_LIMIT = 30;

/** 内置的报备预设 tag（不可删除、所有人共享）。 */
export const PRESET_REPORT_TAGS = ['干饭'] as const;
export type PresetReportTag = (typeof PRESET_REPORT_TAGS)[number];

// ---------- evaluation ----------

/** partner 对一条 post 的评价（只能一条，可改不可删）。 */
export const EVALUATION_MIN = 1;
export const EVALUATION_MAX = 200;

// ---------- 色板 ----------

/**
 * tag chip 的预设调色板（Tailwind bg/文字颜色成对），前端按 `name` 哈希分配。
 * 变更顺序会导致老 tag 换色；新增只追加不插队。
 */
export const POST_TAG_PALETTE = [
  { bg: 'bg-pink-100', text: 'text-pink-600' },
  { bg: 'bg-orange-100', text: 'text-orange-600' },
  { bg: 'bg-amber-100', text: 'text-amber-700' },
  { bg: 'bg-emerald-100', text: 'text-emerald-700' },
  { bg: 'bg-sky-100', text: 'text-sky-700' },
  { bg: 'bg-violet-100', text: 'text-violet-700' },
  { bg: 'bg-rose-100', text: 'text-rose-700' },
] as const;

/** 允许的图片 MIME 白名单（与后端 multer fileFilter、前端 chooseMedia 透出对齐） */
export const ALLOWED_IMAGE_MIME = ['image/jpeg', 'image/png', 'image/webp'] as const;
export type AllowedImageMime = (typeof ALLOWED_IMAGE_MIME)[number];

/** 单张图片上传体积上限（字节）。后端 multer limits.fileSize 默认值与此一致。 */
export const UPLOAD_MAX_SIZE_BYTES = 5 * 1024 * 1024;

/** URL 形式校验：必须是 /static/ 开头的相对路径或 http(s):// 完整 URL。 */
export const ASSET_URL_PATTERN = /^(\/static\/|https?:\/\/)/;
