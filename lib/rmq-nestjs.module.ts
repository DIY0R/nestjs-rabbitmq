import { Module } from '@nestjs/common';
import { RmqNestjsService } from './rmq-nestjs.service';

@Module({
  providers: [RmqNestjsService],
  exports: [RmqNestjsService],
})
export class RmqNestjsModule {}
