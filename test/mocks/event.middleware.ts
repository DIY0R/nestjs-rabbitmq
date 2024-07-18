import { ConsumeMessage } from 'amqplib';
import { IRmqMiddleware } from '../../lib';

export class EventMiddlewareModule implements IRmqMiddleware {
  async use(message: ConsumeMessage, content: any): Promise<void> {
    if (content?.arrayMiddleware) content.arrayMiddleware.push(1);
  }
}

export class EventMiddlewareClass implements IRmqMiddleware {
  async use(message: ConsumeMessage, content: any): Promise<void> {
    if (content?.arrayMiddleware) content.arrayMiddleware.push(2);
  }
}

export class EventMiddlewareEndpoint implements IRmqMiddleware {
  async use(message: ConsumeMessage, content: any): Promise<void> {
    if (content?.arrayMiddleware) content.arrayMiddleware.push(3);
  }
}
export class EventMiddlewareEndpointReturn implements IRmqMiddleware {
  async use(message: ConsumeMessage, content: any): Promise<any> {
    return { return: true };
  }
}
