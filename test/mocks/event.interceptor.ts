import { ConsumeMessage } from 'amqplib';
import {
  ReverseFunction,
  IRmqInterceptor,
} from '../../lib/interfaces/interceptor.interface';

export class EventInterceptorModule implements IRmqInterceptor {
  async intercept(
    message: ConsumeMessage,
    content: any,
  ): Promise<ReverseFunction> {
    if (content?.array) content.array.push(1);
    return async (content: any, message: ConsumeMessage) => {
      if (content?.array) content.array.push(6);
    };
  }
}

export class EventInterceptorClass implements IRmqInterceptor {
  async intercept(
    message: ConsumeMessage,
    content: any,
  ): Promise<ReverseFunction> {
    if (content?.array) content.array.push(2);
    return async (content: any, message: ConsumeMessage) => {
      if (content?.array) content.array.push(5);
    };
  }
}

export class EventInterceptorEndpoint implements IRmqInterceptor {
  async intercept(
    message: ConsumeMessage,
    content: any,
  ): Promise<ReverseFunction> {
    content.array.push(3);
    return async (content: any, message: ConsumeMessage) => {
      content.array.push(4);
    };
  }
}
