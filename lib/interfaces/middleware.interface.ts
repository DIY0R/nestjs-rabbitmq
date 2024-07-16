import { ConsumeMessage } from 'amqplib';
export type NextFunction = () => void;
export abstract class IRmqMiddleware {
  abstract use(
    content: any,
    message: ConsumeMessage,
    next: NextFunction,
  ): Promise<void>;
}
export type TypeRmqMiddleware = typeof IRmqMiddleware;
