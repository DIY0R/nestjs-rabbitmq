import { Options } from 'amqplib';
import { LoggerService, ModuleMetadata } from '@nestjs/common';
import { RMQIntercepterClass, RMQPipeClass } from 'lib/common';

export interface IQueue {
  queue: string;
  options?: Options.AssertQueue;
  consumOptions?: Options.Consume;
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

export type IRabbitMQConfig = string | Options.Connect;

export interface IRabbitMQConfigAsync extends Pick<ModuleMetadata, 'imports'> {
  useFactory?: (...args: any[]) => Promise<IRabbitMQConfig> | IRabbitMQConfig;
  inject?: any[];
}

export interface IMessageBroker {
  exchange: IExchange;
  replyTo?: IQueue;
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
export interface IAppOptions {
  logger?: LoggerService;
  globalMiddleware?: (typeof RMQPipeClass)[];
  globalIntercepters?: (typeof RMQIntercepterClass)[];
  errorHandler?: object;
  logMessages: boolean;
}
export interface IGlobalBroker {
  replyTo: IQueue;
  messageTimeout?: number;
  serviceName?: string;
}

export interface ISocketOptions {
  clientProperties?: { connection_name: string };
}
interface ISocketOptionsCa extends ISocketOptions {
  passphrase?: string;
  ca?: (Buffer | string)[];
}
export interface ISocketOptionsSSLPFX extends ISocketOptionsCa {
  pfx?: Buffer | string;
}
export interface ISocketOptionsSSLKEY extends ISocketOptionsCa {
  cert: Buffer | string;
  key: Buffer | string;
}
export interface IGlobalOptions {
  globalBroker?: IGlobalBroker;
  appOptions?: IAppOptions;
  socketOptions?: ISocketOptionsSSLPFX | ISocketOptionsSSLKEY;
}
export interface INotifyReply {
  status: string;
}
