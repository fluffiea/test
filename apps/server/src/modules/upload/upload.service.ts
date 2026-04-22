import * as fs from 'node:fs';
import * as path from 'node:path';
import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { AppConfig } from '../../config/configuration';

/** 允许上传的图片 MIME 白名单（jpeg/png/webp 足够覆盖头像 & moments）。 */
export const ALLOWED_IMAGE_MIME = [
  'image/jpeg',
  'image/png',
  'image/webp',
] as const;

@Injectable()
export class UploadService {
  private readonly logger = new Logger(UploadService.name);
  private readonly uploadDir: string;
  private readonly maxSizeBytes: number;
  private readonly staticBaseUrl: string;

  constructor(config: ConfigService) {
    const upload = config.get<AppConfig['upload']>('upload')!;
    this.uploadDir = path.isAbsolute(upload.dir)
      ? upload.dir
      : path.resolve(process.cwd(), upload.dir);
    this.maxSizeBytes = upload.maxSizeBytes;
    this.staticBaseUrl = upload.staticBaseUrl.replace(/\/+$/, '');

    if (!fs.existsSync(this.uploadDir)) {
      fs.mkdirSync(this.uploadDir, { recursive: true });
      this.logger.log(`Created upload directory: ${this.uploadDir}`);
    }
  }

  getUploadDir(): string {
    return this.uploadDir;
  }

  getMaxSizeBytes(): number {
    return this.maxSizeBytes;
  }

  getStaticBaseUrl(): string {
    return this.staticBaseUrl;
  }

  /** multer diskStorage 写盘成功后，把 file 信息拼成对外响应。 */
  finalize(file: Express.Multer.File) {
    const relativePath = path
      .relative(this.uploadDir, file.path)
      .replace(/\\/g, '/');
    const url = `/static/${relativePath}`;
    const absoluteUrl = `${this.staticBaseUrl}/${relativePath}`;
    return {
      url,
      absoluteUrl,
      mimeType: file.mimetype,
      size: file.size,
    };
  }
}
