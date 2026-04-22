import { ValidationPipe } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { NestFactory } from '@nestjs/core';
import { WINSTON_MODULE_NEST_PROVIDER } from 'nest-winston';
import helmet from 'helmet';
import { AppModule } from './app.module';
import { HttpExceptionFilter } from './common/filters/http-exception.filter';
import { ResponseInterceptor } from './common/interceptors/response.interceptor';
import { setupSwagger } from './common/swagger/setup-swagger';
import type { AppConfig } from './config/configuration';

async function bootstrap() {
  const app = await NestFactory.create(AppModule, { bufferLogs: true });

  const logger = app.get(WINSTON_MODULE_NEST_PROVIDER);
  app.useLogger(logger);

  app.setGlobalPrefix('api/v1');
  app.use(helmet());
  app.enableCors({
    origin: true,
    credentials: true,
  });

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      transform: true,
      forbidNonWhitelisted: true,
    }),
  );
  app.useGlobalInterceptors(new ResponseInterceptor());
  app.useGlobalFilters(new HttpExceptionFilter());

  const config = app.get(ConfigService);
  const port = config.get<number>('port') ?? 3000;

  const swaggerCfg = config.get<AppConfig['swagger']>('swagger');
  if (swaggerCfg?.enabled) {
    setupSwagger(app, { path: swaggerCfg.path });
  }

  await app.listen(port);

  logger.log(`momoya server listening on http://localhost:${port}/api/v1`, 'Bootstrap');
  if (swaggerCfg?.enabled) {
    logger.log(
      `swagger ui:   http://localhost:${port}/${swaggerCfg.path}`,
      'Bootstrap',
    );
    logger.log(
      `openapi json: http://localhost:${port}/${swaggerCfg.path}-json`,
      'Bootstrap',
    );
  }
}

void bootstrap();
