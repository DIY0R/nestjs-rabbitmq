import { ConsumeMessage } from 'amqplib';
export type NextFunction = () => void;
export abstract class IRmqMiddleware {
  abstract use(message: ConsumeMessage, content: any): any;
}
export type TypeRmqMiddleware = typeof IRmqMiddleware;
