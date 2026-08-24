import { Injectable, NestMiddleware } from '@nestjs/common';
import { Request, Response } from 'express';
import { ApplicationLogger } from './application-logger.service';

const SENSITIVE_QUERY_PARAMETER =
  /^(access[_-]?token|api[_-]?key|authorization|cookie|jwt|password|refresh[_-]?token|secret|session|token)$/i;

@Injectable()
export class LoggerMiddleware implements NestMiddleware {
  constructor(private readonly logger: ApplicationLogger) {}

  use(req: Request, res: Response, next: () => void): void {
    const startedAt = process.hrtime.bigint();
    let responseLogged = false;

    const logResponse = () => {
      if (responseLogged) {
        return;
      }

      responseLogged = true;
      const durationMs =
        Number(process.hrtime.bigint() - startedAt) / 1_000_000;
      this.logger.logHttpRequest(
        req.method,
        this.sanitizeUrl(req.originalUrl),
        res.statusCode,
        durationMs,
      );
    };

    res.once('finish', logResponse);
    res.once('close', logResponse);
    next();
  }

  private sanitizeUrl(originalUrl: string): string {
    const url = new URL(originalUrl, 'http://localhost');

    for (const parameter of [...url.searchParams.keys()]) {
      if (SENSITIVE_QUERY_PARAMETER.test(parameter)) {
        url.searchParams.delete(parameter);
      }
    }

    return `${url.pathname}${url.search}`;
  }
}
