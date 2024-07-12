import { Injectable, Logger } from '@nestjs/common';
import {
  MessageNonRoute,
  MessageRoute,
  RmqInterceptor,
  SerDes,
} from '../../lib/decorators/';
import { RmqService } from '../../lib';
import { ConsumeMessage } from 'amqplib';
import {
  EventInterceptorClass,
  EventInterceptorEndpoint,
} from './event.interceptor';

@Injectable()
@SerDes({
  deserialize: (message: Buffer): any => JSON.parse(message.toString()),
  serializer: (message: any): Buffer => Buffer.from(JSON.stringify(message)),
})
@RmqInterceptor(EventInterceptorClass)
export class RmqEvents {
  constructor(private readonly rmqServie: RmqService) {}
  @MessageRoute('text.text')
  recived(obj: any, consumeMessage: ConsumeMessage) {
    this.rmqServie.ack(consumeMessage);
    return { message: obj };
  }
  @MessageRoute('text.nothing')
  recivedReturnNoting(obj: any, consumeMessage: ConsumeMessage) {
    this.rmqServie.ack(consumeMessage);
  }

  @MessageRoute('*.rpc.*')
  @SerDes({
    deserialize: (message: Buffer): any => JSON.parse(message.toString()),
    serializer: (message: any): Buffer => Buffer.from(JSON.stringify(message)),
  })
  recivedTopic(obj: any, consumeMessage: ConsumeMessage) {
    this.rmqServie.ack(consumeMessage);
    return { message: obj };
  }

  @MessageRoute('*.rpc.mix.#')
  recivedMixTopic(obj: any, consumeMessage: ConsumeMessage) {
    this.rmqServie.ack(consumeMessage);
    return { message: obj };
  }
  @MessageRoute('global.rpc')
  recivedGlobal(obj: any, consumeMessage: ConsumeMessage) {
    this.rmqServie.ack(consumeMessage);
    return { message: obj };
  }

  @MessageRoute('rpc.#')
  recivedTopicPattern(obj: any, consumeMessage: ConsumeMessage) {
    this.rmqServie.ack(consumeMessage);
    return { message: obj };
  }
  @MessageRoute('notify.global')
  recivedTopicNotify(obj: any, consumeMessage: ConsumeMessage) {
    this.rmqServie.ack(consumeMessage);
    Logger.log(obj);
  }
  @MessageRoute('text.interceptor')
  @RmqInterceptor(EventInterceptorEndpoint)
  recivedMessage(obj: any, consumeMessage: ConsumeMessage) {
    this.rmqServie.ack(consumeMessage);
    return obj;
  }
  @MessageNonRoute()
  recivedNonRoute(obj: any, consumeMessage: ConsumeMessage) {
    this.rmqServie.ack(consumeMessage);
    return { message: obj };
  }
}
