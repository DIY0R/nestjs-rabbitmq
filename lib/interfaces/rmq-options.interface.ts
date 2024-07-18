import { Options } from 'amqplib';
import { LoggerService, ModuleMetadata } from '@nestjs/common';
import { ISerDes } from './serdes.interface';
import { TypeRmqInterceptor } from './interceptor.interface';
import { TypeRmqMiddleware } from './middleware.interface';

export interface IQueue {
  queue: string;
  options?: Options.AssertQueue;
  consumOptions?: Options.Consume;
}
export enum TypeQueue {
  QUEUE,
  REPLY_QUEUE,
}
export enum TypeChanel {
  CHANEL,
  CONFIRM_CHANEL,
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
  options?: Options.Publish;
}
export interface IAppOptions {
  logger?: LoggerService;

  errorHandler?: object;
  logMessages: boolean;
}
export interface IGlobalBroker {
  replyTo: IQueue;
  messageTimeout?: number;
  serviceName?: string;
  serDes?: ISerDes;
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
  typeChanel?: TypeChanel;
}
export interface INotifyReply {
  status: string;
}
