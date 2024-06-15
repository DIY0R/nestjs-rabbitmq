import { Options } from 'amqplib';
import { ModuleMetadata } from '@nestjs/common';

export interface IQueue {
  queue: string;
  options?: Options.AssertQueue;
}
export enum TypeQueue {
  QUEUE,
  REPLY_QUEUE,
}

export interface IExchange {
  exchange: string;
  type: 'direct' | 'topic' | 'headers' | 'fanout' | 'match';
  options?: Options.AssertExchange;
}

export interface IRabbitMQConfig {
  username: string;
  password: string;
  hostname: string;
  port: number;
  virtualHost: string;
}

export interface IRMQSRootAsyncOptions extends Pick<ModuleMetadata, 'imports'> {
  useFactory?: (...args: any[]) => Promise<IRabbitMQConfig> | IRabbitMQConfig;
  inject?: any[];
}

export interface IMessageBroker {
  exchange: IExchange;
  queue?: IQueue;
  replyTo: Options.AssertQueue;
  targetModuleName: string;
}
export interface BindQueue {
  queue: string;
  source: string;
  pattern: string;
  args?: Record<string, any>;
}
