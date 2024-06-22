import { Module } from '@nestjs/common';
import { RmqNestjsModule, RmqService } from '../../lib';
import { RmqEvents } from './rmq.event';
import { RmqServieController } from './rmq.controller';

@Module({
  imports: [
    RmqNestjsModule.forFeature({
      exchange: {
        exchange: 'for-test',
        type: 'topic',
        options: { durable: true },
      },
      queue: { queue: 'test-for', options: { durable: true } },

      replyTo: { durable: true },
      targetModuleName: 'ConnectionMockModule',
    }),
  ],
  providers: [RmqEvents, RmqServieController],
  exports: [RmqServieController],
})
export class ConnectionMockModule {}
