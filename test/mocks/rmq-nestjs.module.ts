import { Module } from '@nestjs/common';
import { RmqModule } from '../../lib';
import { RmqEvents } from './rmq.event';
import { RmqServiceController } from './rmq.controller';
import { EventInterceptorModule } from './event.interceptor';
import { EventMiddlewareModule } from './event.middleware';
import { MyRMQErrorHandler } from './error.handlers';

@Module({
  imports: [
    RmqModule.forFeatureAsync({
      useFactory: async () => ({
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
          consumeOptions: { noAck: false },
        },

        replyTo: {
          queue: '',
          options: { exclusive: true },
          consumeOptions: { noAck: true },
          errorHandler: MyRMQErrorHandler,
        },
        serviceName: 'Connection-Service-Spec',
      }),
      interceptors: [EventInterceptorModule],
      middlewares: [EventMiddlewareModule],
    }),
  ],
  providers: [RmqEvents, RmqServiceController],
  exports: [RmqServiceController, RmqModule],
})
export class ConnectionMockModule {}
