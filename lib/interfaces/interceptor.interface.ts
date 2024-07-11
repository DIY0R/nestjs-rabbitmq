import { ConsumeMessage } from 'amqplib';

export type ReverseFunction = (
  content: any,
  message: ConsumeMessage,
) => Promise<void>;
export abstract class IRmqInterceptor {
  abstract intercept(
    content: any,
    message: ConsumeMessage,
  ): Promise<ReverseFunction>;
}
export type TypeRmqInterceptor = typeof IRmqInterceptor;
