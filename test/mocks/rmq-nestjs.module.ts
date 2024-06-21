import { Module } from '@nestjs/common';
import { RmqNestjsModule } from 'lib';
import { RmqEvents } from './rmq.event.spec';

@Module({
  imports: [
    RmqNestjsModule.forFeature({
      exchange: {
        exchange: 'for-test',
        type: 'topic',
        options: { durable: true },
      },
      queue: { queue: 'user', options: { durable: true } },

      replyTo: { exclusive: true },
      targetModuleName: 'ConnectionMockModule',
    }),
    RmqEvents,
  ],
})
export class ConnectionMockModule {}
