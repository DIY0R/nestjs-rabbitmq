import { ConsumeMessage } from 'amqplib';

export type ReverseFunction = (message: ConsumeMessage, content: any) => any;
export type NextFunction = (reverseFn: ReverseFunction) => void;
export abstract class IRmqInterceptor {
  abstract intercept(
    message: ConsumeMessage,
    content: any,
    next: NextFunction,
  ): void;
}
