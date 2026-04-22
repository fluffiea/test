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
/** 单条 moment 的文本上限 */
export const MOMENT_TEXT_MAX = 500;
/** 单条 moment 最多几张图 */
export const MOMENT_IMAGE_MAX = 9;
/** 允许的图片 MIME 白名单（与后端 multer fileFilter、前端 chooseMedia 透出对齐） */
export const ALLOWED_IMAGE_MIME = ['image/jpeg', 'image/png', 'image/webp'];
/** 单张图片上传体积上限（字节）。后端 multer limits.fileSize 默认值与此一致。 */
export const UPLOAD_MAX_SIZE_BYTES = 5 * 1024 * 1024;
/** URL 形式校验：必须是 /static/ 开头的相对路径或 http(s):// 完整 URL。 */
export const ASSET_URL_PATTERN = /^(\/static\/|https?:\/\/)/;
//# sourceMappingURL=constants.js.map