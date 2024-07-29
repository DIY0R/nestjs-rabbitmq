import { MessagePropertyHeaders, Options } from 'amqplib';
import { LoggerService, ModuleMetadata } from '@nestjs/common';
import { ISerDes } from './serdes.interface';
import { TypeRmqInterceptor } from './interceptor.interface';
import { TypeRmqMiddleware } from './middleware.interface';
import { IRmqErrorHeaders } from './error.headers.interface';
import { RMQErrorHandler } from '../common';

export interface IQueue {
  queue: string;
  options?: Options.AssertQueue;
  consumOptions?: Options.Consume;
}
export interface IReplyQueue extends IQueue {
  errorHandler?: typeof RMQErrorHandler;
}
export enum TypeQueue {
  QUEUE,
  REPLY_QUEUE,
}
export enum TypeChannel {
  CHANNEL,
  CONFIRM_CHANNEL,
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
  replyTo?: IReplyQueue;
  queue?: IQueue;
  serDes?: ISerDes;
  interceptor?: TypeRmqInterceptor[];
  middlewares?: TypeRmqMiddleware[];
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
  content: Buffer;
  options: Options.Publish;
}
export interface IPublishOptions extends Options.Publish {
  timeout?: number;
}

export interface ISendToReplyQueueOptions {
  replyTo: string;
  content: Buffer;
  correlationId: string;
  headers: IRmqErrorHeaders | MessagePropertyHeaders;
}
export interface IAppOptions {
  logger?: LoggerService;
  logMessages: boolean;
}
export interface IGlobalBroker {
  replyTo: IReplyQueue;
  messageTimeout?: number;
  serviceName?: string;
  serDes?: ISerDes;
  errorssHandler?: typeof RMQErrorHandler;
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
  typeChannel?: TypeChannel;
}
export interface INotifyReply {
  status: string;
}
