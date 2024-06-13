import { Options } from 'amqplib';

export interface IQueue {
  queue: string;
  options?: Options.AssertQueue;
}
export enum TypeQueue {
  QUEUE,
  REPLY_QUEUE,
}
