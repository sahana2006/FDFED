import { Injectable, LoggerService, OnModuleDestroy } from '@nestjs/common';
import { join } from 'path';
import { createLogger, format } from 'winston';
import DailyRotateFile from 'winston-daily-rotate-file';

const { combine, errors, json, timestamp } = format;
const excludeErrors = format((info) => (info.level === 'error' ? false : info));

@Injectable()
export class ApplicationLogger implements LoggerService, OnModuleDestroy {
  private readonly logger = createLogger({
    transports: [
      new DailyRotateFile({
        dirname: join(process.cwd(), 'logs'),
        filename: 'application-%DATE%.log',
        datePattern: 'YYYY-MM-DD',
        maxSize: '20m',
        maxFiles: '14d',
        format: combine(
          excludeErrors(),
          timestamp(),
          errors({ stack: true }),
          json(),
        ),
      }),
      new DailyRotateFile({
        dirname: join(process.cwd(), 'logs'),
        filename: 'error-%DATE%.log',
        datePattern: 'YYYY-MM-DD',
        level: 'error',
        maxSize: '20m',
        maxFiles: '30d',
        format: combine(timestamp(), errors({ stack: true }), json()),
      }),
    ],
    exitOnError: false,
  });

  log(message: unknown, ...optionalParams: unknown[]): void {
    this.write('info', message, optionalParams);
  }

  error(message: unknown, ...optionalParams: unknown[]): void {
    this.write('error', message, optionalParams);
  }

  warn(message: unknown, ...optionalParams: unknown[]): void {
    this.write('warn', message, optionalParams);
  }

  debug(message: unknown, ...optionalParams: unknown[]): void {
    this.write('debug', message, optionalParams);
  }

  verbose(message: unknown, ...optionalParams: unknown[]): void {
    this.write('verbose', message, optionalParams);
  }

  fatal(message: unknown, ...optionalParams: unknown[]): void {
    this.write('error', message, optionalParams);
  }

  logHttpRequest(
    method: string,
    url: string,
    statusCode: number,
    responseTimeMs: number,
  ): void {
    const message = `${method} ${url} ${statusCode} ${responseTimeMs.toFixed(2)}ms`;
    const metadata = {
      method,
      url,
      statusCode,
      responseTimeMs: Number(responseTimeMs.toFixed(2)),
    };

    if (statusCode >= 500) {
      this.logger.error(message, metadata);
    } else if (statusCode >= 400) {
      this.logger.warn(message, metadata);
    } else {
      this.logger.info(message, metadata);
    }
  }

  onModuleDestroy(): void {
    this.logger.close();
  }

  private write(
    level: string,
    message: unknown,
    optionalParams: unknown[],
  ): void {
    const context = optionalParams.at(-1);
    const stack =
      level === 'error' && optionalParams.length > 1
        ? optionalParams[0]
        : undefined;
    const metadata = {
      ...(typeof context === 'string' ? { context } : {}),
      ...(typeof stack === 'string' ? { stack } : {}),
    };

    this.logger.log(level, this.stringifyMessage(message), metadata);
  }

  private stringifyMessage(message: unknown): string {
    if (typeof message === 'string') {
      return message;
    }

    if (message instanceof Error) {
      return message.message;
    }

    return JSON.stringify(message);
  }
}
