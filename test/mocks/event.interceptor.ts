import { ConsumeMessage } from 'amqplib';
import { Injectable } from '@nestjs/common';
import { RmqService, ReverseFunction, IRmqInterceptor } from '../../lib';

@Injectable()
export class EventInterceptorModule implements IRmqInterceptor {
  async intercept(message: ConsumeMessage, content: any): Promise<ReverseFunction> {
    if (content?.arrayInterceptor) content.arrayInterceptor.push(1);
    return async (content: any, message: ConsumeMessage) => {
      if (content?.arrayInterceptor) content.arrayInterceptor.push(6);
    };
  }
}
@Injectable()
export class EventInterceptorClass implements IRmqInterceptor {
  async intercept(message: ConsumeMessage, content: any): Promise<ReverseFunction> {
    if (content?.arrayInterceptor) content.arrayInterceptor.push(2);
    return async (content: any, message: ConsumeMessage) => {
      if (content?.arrayInterceptor) content.arrayInterceptor.push(5);
    };
  }
}
@Injectable()
export class EventInterceptorEndpoint implements IRmqInterceptor {
  constructor(private readonly rmqSerivce: RmqService) {}
  async intercept(message: ConsumeMessage, content: any): Promise<ReverseFunction> {
    content.arrayInterceptor.push(3);
    return async (content: any, message: ConsumeMessage) => {
      const { number } = await this.rmqSerivce.send<object, any>('text.number', {
        number: 4,
      });
      content.arrayInterceptor.push(number);
    };
  }
}
