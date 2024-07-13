import { Module } from '@nestjs/common';
import { RmqModule } from '../../lib';
import { RmqEvents } from './rmq.event';
import { RmqServieController } from './rmq.controller';
import { EventInterceptorModule } from './event.interceptor';

@Module({
  imports: [
    RmqModule.forFeature({
      exchange: {
        exchange: 'for-test',
        type: 'topic',

        options: {
          durable: true,
          autoDelete: true,
        },
      },
      queue: {
        queue: 'test-for',
        options: { durable: true },
        consumOptions: { noAck: false },
      },
      replyTo: {
        queue: '',
        options: { exclusive: true },
        consumOptions: { noAck: true },
      },
      interceptor: [EventInterceptorModule],
    }),
  ],
  providers: [RmqEvents, RmqServieController],
  exports: [RmqServieController, RmqModule],
})
export class ConnectionMockModule {}
