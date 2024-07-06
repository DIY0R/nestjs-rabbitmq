import { Module } from '@nestjs/common';
import { RmqNestjsModule } from '../../lib';
import { RmqEvents } from './rmq.event';
import { RmqServieController } from './rmq.controller';

@Module({
  imports: [
    RmqNestjsModule.forFeature({
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
      serDes: {
        deserialize: (message: Buffer): any => JSON.parse(message.toString()),
        serializer: (message: any): Buffer =>
          Buffer.from(JSON.stringify(message)),
      },
    }),
  ],
  providers: [RmqEvents, RmqServieController],
  exports: [RmqServieController, RmqNestjsModule],
})
export class ConnectionMockModule {}
