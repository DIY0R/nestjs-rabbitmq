import { Injectable, Logger } from '@nestjs/common';
import { ConsumeMessage } from 'amqplib';
import {
  RmqService,
  RmqMiddleware,
  MessageNonRoute,
  MessageRoute,
  RmqInterceptor,
  SerDes,
} from '../../lib';
import {
  EventInterceptorClass,
  EventInterceptorEndpoint,
} from './event.interceptor';
import {
  EventMiddlewareClass,
  EventMiddlewareEndpoint,
  EventMiddlewareEndpointReturn,
} from './event.middleware';
import { RMQError } from '../../lib/common';
@Injectable()
@SerDes({
  deserialize: (message: Buffer): any => JSON.parse(message.toString()),
  serialize: (message: any): Buffer => Buffer.from(JSON.stringify(message)),
})
@RmqMiddleware(EventMiddlewareClass)
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
    serialize: (message: any): Buffer => Buffer.from(JSON.stringify(message)),
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
  @MessageRoute('error.error')
  recivedTopicError(obj: any, consumeMessage: ConsumeMessage) {
    this.rmqServie.ack(consumeMessage);
    throw new Error('error');
  }
  @MessageRoute('error.error.rmq')
  recivedTopicErrorRmq(obj: any, consumeMessage: ConsumeMessage) {
    this.rmqServie.ack(consumeMessage);
    throw new RMQError('error', 'myService', 302);
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

  @RmqMiddleware(EventMiddlewareEndpoint)
  @MessageRoute('text.middleware')
  messageMiddleware(obj: any, consumeMessage: ConsumeMessage) {
    this.rmqServie.ack(consumeMessage);
    return obj;
  }

  @RmqMiddleware(EventMiddlewareEndpointReturn)
  @MessageRoute('text.middleware.return')
  messageMiddlewareReturn(obj: any, consumeMessage: ConsumeMessage) {
    this.rmqServie.ack(consumeMessage);
    return obj;
  }
  @MessageRoute('text.number')
  numberGet(obj: any, consumeMessage: ConsumeMessage) {
    this.rmqServie.ack(consumeMessage);
    return { number: obj.number };
  }

  @MessageNonRoute()
  recivedNonRoute(obj: any, consumeMessage: ConsumeMessage) {
    this.rmqServie.ack(consumeMessage);
    return { message: obj };
  }
}
