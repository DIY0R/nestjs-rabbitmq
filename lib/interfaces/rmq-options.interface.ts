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
  replyTo?: Options.AssertQueue;
  queue?: IQueue;
  messageTimeout?: number;
  serviceName?: string;
}
export interface IBindQueue {
  queue: string;
  source: string;
  pattern: string;
  args?: Record<string, any>;
}

export interface ISendMessage {
  exchange: string;
  routingKey: string;
  content: Record<string, any>;
  options: Options.Publish;
}
export interface IPublishOptions extends Options.Publish {
  timeout?: number;
}

export interface ISendToReplyQueueOptions {
  replyTo: string;
  content: Record<string, any>;
  correlationId: string;
  options?: Options.Publish;
}
