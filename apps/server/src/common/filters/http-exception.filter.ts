import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import type { Request, Response } from 'express';
import {
  ErrorCode,
  ErrorKey,
  ErrorKeyType,
  httpStatusToErrorKey,
} from '../constants/error-keys';

interface ErrorResponseBody {
  code: number;
  data: null;
  msg: string;
  errorKey: ErrorKeyType;
}

@Catch()
export class HttpExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger(HttpExceptionFilter.name);

  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();

    let httpStatus = HttpStatus.INTERNAL_SERVER_ERROR;
    let msg = 'Internal server error';
    let errorKey: ErrorKeyType = ErrorKey.E_INTERNAL;

    if (exception instanceof HttpException) {
      httpStatus = exception.getStatus();
      const resBody = exception.getResponse();
      if (typeof resBody === 'string') {
        msg = resBody;
      } else if (typeof resBody === 'object' && resBody !== null) {
        const maybeMsg = (resBody as { message?: unknown }).message;
        if (Array.isArray(maybeMsg)) {
          msg = maybeMsg.join('; ');
        } else if (typeof maybeMsg === 'string') {
          msg = maybeMsg;
        } else {
          msg = exception.message;
        }
        const providedKey = (resBody as { errorKey?: unknown }).errorKey;
        if (typeof providedKey === 'string' && providedKey in ErrorCode) {
          errorKey = providedKey as ErrorKeyType;
        }
      }
      if (errorKey === ErrorKey.E_INTERNAL) {
        errorKey = httpStatusToErrorKey[httpStatus] ?? ErrorKey.E_INTERNAL;
      }
    } else if (exception instanceof Error) {
      msg = exception.message || msg;
      this.logger.error(
        `Unhandled exception at ${request.method} ${request.url}`,
        exception.stack,
      );
    } else {
      this.logger.error(
        `Unknown exception at ${request.method} ${request.url}`,
        String(exception),
      );
    }

    const body: ErrorResponseBody = {
      code: ErrorCode[errorKey],
      data: null,
      msg,
      errorKey,
    };

    response.status(httpStatus).json(body);
  }
}
