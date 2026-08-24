import { Module } from '@nestjs/common';
import { ApplicationLogger } from './application-logger.service';
import { RequestContextService } from './request-context.service';

@Module({
  providers: [ApplicationLogger, RequestContextService],
  exports: [ApplicationLogger, RequestContextService],
})
export class CommonModule {}
