"use strict";
/**
 * 领域常量：文本 / 图片 / 上传体积等。
 * 后端 DTO 与前端表单都应直接引用这里的字面量，避免各自写一份。
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.ASSET_URL_PATTERN = exports.UPLOAD_MAX_SIZE_BYTES = exports.ALLOWED_IMAGE_MIME = exports.POST_TAG_PALETTE = exports.EVALUATION_MAX = exports.EVALUATION_MIN = exports.PRESET_REPORT_TAGS = exports.USER_TAG_PER_USER_LIMIT = exports.REPORT_TAG_MAX = exports.REPORT_TAG_MIN = exports.TAG_NAME_MAX = exports.DAILY_TAG_MAX_PER_POST = exports.MOMENT_IMAGE_MAX = exports.POST_IMAGE_MAX = exports.MOMENT_TEXT_MAX = exports.POST_TEXT_MAX = exports.PASSWORD_MAX = exports.PASSWORD_MIN = exports.BIO_MAX = exports.NICKNAME_MAX = exports.NICKNAME_MIN = void 0;
/** 昵称长度（含） */
exports.NICKNAME_MIN = 1;
exports.NICKNAME_MAX = 20;
/** 个性签名长度（上限，允许空串） */
exports.BIO_MAX = 100;
/** 密码长度（含） */
exports.PASSWORD_MIN = 6;
exports.PASSWORD_MAX = 64;
/**
 * 单条 post（日常 / 报备）的文本上限。
 * 历史名 `MOMENT_TEXT_MAX` 仍导出为等值别名，旧调用点逐步替换即可。
 */
exports.POST_TEXT_MAX = 500;
/** @deprecated 使用 {@link POST_TEXT_MAX}。 */
exports.MOMENT_TEXT_MAX = exports.POST_TEXT_MAX;
/** 单条 post 最多几张图 */
exports.POST_IMAGE_MAX = 9;
/** @deprecated 使用 {@link POST_IMAGE_MAX}。 */
exports.MOMENT_IMAGE_MAX = exports.POST_IMAGE_MAX;
// ---------- tags ----------
/**
 * 日常 post 的 tag：前端自由输入、按 `,`/`，` 分割入数组，不持久到独立集合，
 * 只和 post 一起存。单条 post 上 tag 的数量上限（避免滥用）。
 */
exports.DAILY_TAG_MAX_PER_POST = 10;
/** 单个 tag 名称长度上限（字符数）。日常 / 报备共用。 */
exports.TAG_NAME_MAX = 10;
/** 报备 post 的 tag：持久化在 user_tags（自定义）+ preset 合并，发布时从中勾选。 */
exports.REPORT_TAG_MIN = 1;
exports.REPORT_TAG_MAX = 10;
/** 每个用户最多可以持有多少个 custom 报备 tag。 */
exports.USER_TAG_PER_USER_LIMIT = 30;
/** 内置的报备预设 tag（不可删除、所有人共享）。 */
exports.PRESET_REPORT_TAGS = ['干饭'];
// ---------- evaluation ----------
/** partner 对一条 post 的评价（只能一条，可改不可删）。 */
exports.EVALUATION_MIN = 1;
exports.EVALUATION_MAX = 200;
// ---------- 色板 ----------
/**
 * tag chip 的预设调色板（Tailwind bg/文字颜色成对），前端按 `name` 哈希分配。
 * 变更顺序会导致老 tag 换色；新增只追加不插队。
 */
exports.POST_TAG_PALETTE = [
    { bg: 'bg-pink-100', text: 'text-pink-600' },
    { bg: 'bg-orange-100', text: 'text-orange-600' },
    { bg: 'bg-amber-100', text: 'text-amber-700' },
    { bg: 'bg-emerald-100', text: 'text-emerald-700' },
    { bg: 'bg-sky-100', text: 'text-sky-700' },
    { bg: 'bg-violet-100', text: 'text-violet-700' },
    { bg: 'bg-rose-100', text: 'text-rose-700' },
];
/** 允许的图片 MIME 白名单（与后端 multer fileFilter、前端 chooseMedia 透出对齐） */
exports.ALLOWED_IMAGE_MIME = ['image/jpeg', 'image/png', 'image/webp'];
/** 单张图片上传体积上限（字节）。后端 multer limits.fileSize 默认值与此一致。 */
exports.UPLOAD_MAX_SIZE_BYTES = 5 * 1024 * 1024;
/** URL 形式校验：必须是 /static/ 开头的相对路径或 http(s):// 完整 URL。 */
exports.ASSET_URL_PATTERN = /^(\/static\/|https?:\/\/)/;
//# sourceMappingURL=constants.js.map