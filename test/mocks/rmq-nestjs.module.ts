import { Module } from '@nestjs/common';
import { RmqModule } from '../../lib';
import { RmqEvents } from './rmq.event';
import { RmqServieController } from './rmq.controller';
import { EventInterceptorModule } from './event.interceptor';
import { EventMiddlewareModule } from './event.middleware';
import { MyRMQErrorHandler } from './error.handlers';

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
        errorHandler: MyRMQErrorHandler,
      },
      interceptor: [EventInterceptorModule],
      middlewares: [EventMiddlewareModule],
      serviceName: 'Connection-Service-Spec',
    }),
  ],
  providers: [RmqEvents, RmqServieController],
  exports: [RmqServieController, RmqModule],
})
export class ConnectionMockModule {}
