import * as fs from 'node:fs';
import * as path from 'node:path';
import { HttpException, HttpStatus, Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { MulterModule } from '@nestjs/platform-express';
import { diskStorage } from 'multer';
import { v4 as uuidv4 } from 'uuid';
import { ErrorKey } from '../../common/constants/error-keys';
import type { AppConfig } from '../../config/configuration';
import { AuthModule } from '../auth/auth.module';
import { UploadController } from './upload.controller';
import { ALLOWED_IMAGE_MIME, UploadService } from './upload.service';

const MIME_EXT_MAP: Record<string, string> = {
  'image/jpeg': '.jpg',
  'image/png': '.png',
  'image/webp': '.webp',
};

function buildUploadParts(now: Date): {
  dirSegments: [string, string, string];
  basenamePrefix: string;
} {
  const yyyy = String(now.getFullYear());
  const mm = String(now.getMonth() + 1).padStart(2, '0');
  const dd = String(now.getDate()).padStart(2, '0');
  const hh = String(now.getHours()).padStart(2, '0');
  const min = String(now.getMinutes()).padStart(2, '0');
  const ss = String(now.getSeconds()).padStart(2, '0');
  return {
    dirSegments: [yyyy, mm, dd],
    basenamePrefix: `${yyyy}-${mm}-${dd}-${hh}-${min}-${ss}`,
  };
}

@Module({
  imports: [
    AuthModule, // 需要 JwtAccessGuard
    MulterModule.registerAsync({
      inject: [ConfigService],
      useFactory: (config: ConfigService) => {
        const upload = config.get<AppConfig['upload']>('upload')!;
        const baseDir = path.isAbsolute(upload.dir)
          ? upload.dir
          : path.resolve(process.cwd(), upload.dir);
        if (!fs.existsSync(baseDir)) {
          fs.mkdirSync(baseDir, { recursive: true });
        }

        return {
          storage: diskStorage({
            destination: (_req, _file, cb) => {
              const { dirSegments } = buildUploadParts(new Date());
              const dir = path.join(baseDir, ...dirSegments);
              fs.mkdir(dir, { recursive: true }, (err) => cb(err, dir));
            },
            filename: (_req, file, cb) => {
              const { basenamePrefix } = buildUploadParts(new Date());
              const shortId = uuidv4().replace(/-/g, '').slice(0, 8);
              const ext =
                MIME_EXT_MAP[file.mimetype] ??
                path.extname(file.originalname) ??
                '';
              cb(null, `${basenamePrefix}-${shortId}${ext}`);
            },
          }),
          fileFilter: (_req, file, cb) => {
            if (
              !(ALLOWED_IMAGE_MIME as readonly string[]).includes(file.mimetype)
            ) {
              cb(
                new HttpException(
                  {
                    message: `不支持的文件类型：${file.mimetype}`,
                    errorKey: ErrorKey.E_UPLOAD_TYPE,
                  },
                  HttpStatus.UNSUPPORTED_MEDIA_TYPE,
                ),
                false,
              );
              return;
            }
            cb(null, true);
          },
          limits: {
            fileSize: upload.maxSizeBytes,
            files: 1,
          },
        };
      },
    }),
  ],
  controllers: [UploadController],
  providers: [UploadService],
  exports: [UploadService],
})
export class UploadModule {}
