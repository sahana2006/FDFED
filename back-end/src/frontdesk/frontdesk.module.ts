import { Module } from '@nestjs/common';
import { UsersModule } from '../users/users.module';
import { FrontdeskController } from './frontdesk.controller';
import { FrontdeskService } from './frontdesk.service';

@Module({
  imports: [UsersModule],
  controllers: [FrontdeskController],
  providers: [FrontdeskService],
  exports: [FrontdeskService],
})
export class FrontdeskModule {}
