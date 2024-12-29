import { ConsumeMessage } from 'amqplib';
import { ISerDes } from './serdes.interface';
import { TypeRmqMiddleware } from './middleware.interface';

export type IConsumeFunction = (message?: any, consumeMessage?: ConsumeMessage) => any | void;
export interface MetaTagEndpoint {
  handler: IConsumeFunction;
  serdes?: ISerDes | undefined;
  interceptors: CallbackFunctionVariadic[];
  middlewares: TypeRmqMiddleware[];
  validate: null;
}
export type IMetaTagsMap = Map<string, MetaTagEndpoint>;
export interface IDescriptorRoute {
  value?: IConsumeFunction;
}

export type CallbackFunctionVariadic = (...args: any[]) => any;
