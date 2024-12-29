import { Injectable, Logger } from '@nestjs/common';
import { ConsumeMessage } from 'amqplib';
import {
  RmqService,
  RmqMiddleware,
  MessageNonRoute,
  MessageRoute,
  RmqInterceptor,
  SerDes,
  RMQValidate,
  RMQError,
} from '../../lib';
import { EventInterceptorClass, EventInterceptorEndpoint } from './event.interceptor';
import {
  EventMiddlewareClass,
  EventMiddlewareEndpoint,
  EventMiddlewareEndpointReturn,
} from './event.middleware';
import { MyClass } from './dto/myClass.dto';

@Injectable()
@SerDes({
  deserialize: (message: Buffer): any => JSON.parse(message.toString()),
  serialize: (message: any): Buffer => Buffer.from(JSON.stringify(message)),
})
@RmqMiddleware(EventMiddlewareClass)
@RmqInterceptor(EventInterceptorClass)
export class RmqEvents {
  constructor(private readonly rmqService: RmqService) {}
  @MessageRoute('text.text')
  receive(obj: any, consumeMessage: ConsumeMessage) {
    this.rmqService.ack(consumeMessage);
    return { message: obj };
  }

  @MessageRoute('text.nothing')
  receiveReturnNoting(obj: any, consumeMessage: ConsumeMessage) {
    this.rmqService.ack(consumeMessage);
  }

  @MessageRoute('*.rpc.*')
  @SerDes({
    deserialize: (message: Buffer): any => JSON.parse(message.toString()),
    serialize: (message: any): Buffer => Buffer.from(JSON.stringify(message)),
  })
  receiveTopic(obj: any, consumeMessage: ConsumeMessage) {
    this.rmqService.ack(consumeMessage);
    return { message: obj };
  }

  @MessageRoute('*.rpc.mix.#')
  receiveMixTopic(obj: any, consumeMessage: ConsumeMessage) {
    this.rmqService.ack(consumeMessage);
    return { message: obj };
  }

  @MessageRoute('global.rpc')
  receiveGlobal(obj: any, consumeMessage: ConsumeMessage) {
    this.rmqService.ack(consumeMessage);
    return { message: obj };
  }

  @MessageRoute('rpc.#')
  receiveTopicPattern(obj: any, consumeMessage: ConsumeMessage) {
    this.rmqService.ack(consumeMessage);
    return { message: obj };
  }

  @MessageRoute('error.error')
  receiveTopicError(obj: any, consumeMessage: ConsumeMessage) {
    this.rmqService.ack(consumeMessage);
    throw new Error('error');
  }

  @MessageRoute('error.error.rmq')
  receiveTopicErrorRmq(obj: any, consumeMessage: ConsumeMessage) {
    this.rmqService.ack(consumeMessage);
    throw new RMQError('error', 'myService', 302);
  }

  @MessageRoute('notify.global')
  receiveTopicNotify(obj: any, consumeMessage: ConsumeMessage) {
    this.rmqService.ack(consumeMessage);
    Logger.log(obj);
  }

  @MessageRoute('text.interceptor')
  @RmqInterceptor(EventInterceptorEndpoint)
  receiveMessage(obj: any, consumeMessage: ConsumeMessage) {
    this.rmqService.ack(consumeMessage);
    return obj;
  }

  @RmqMiddleware(EventMiddlewareEndpoint)
  @MessageRoute('text.middleware')
  messageMiddleware(obj: any, consumeMessage: ConsumeMessage) {
    this.rmqService.ack(consumeMessage);
    return obj;
  }

  @RmqMiddleware(EventMiddlewareEndpointReturn)
  @MessageRoute('text.middleware.return')
  messageMiddlewareReturn(obj: any, consumeMessage: ConsumeMessage) {
    this.rmqService.ack(consumeMessage);
    return obj;
  }

  @MessageRoute('text.number')
  numberGet(obj: any, consumeMessage: ConsumeMessage) {
    this.rmqService.ack(consumeMessage);
    return { number: obj.number };
  }

  @MessageRoute('message.valid')
  @RMQValidate()
  getValidMessage(obj: MyClass, consumeMessage: ConsumeMessage) {
    this.rmqService.ack(consumeMessage);
    return { message: obj };
  }

  @MessageNonRoute()
  receiveNonRoute(obj: any, consumeMessage: ConsumeMessage) {
    this.rmqService.ack(consumeMessage);
    return { message: obj };
  }
}
