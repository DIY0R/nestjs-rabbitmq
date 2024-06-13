import { ModuleMetadata } from '@nestjs/common';
import { IQueue } from './queue';
import { IExchange } from './exchange';
import { Options } from 'amqplib';

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
}
