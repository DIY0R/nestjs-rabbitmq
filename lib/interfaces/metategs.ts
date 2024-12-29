import { ConsumeMessage } from 'amqplib';
import { ISerDes } from './serdes.interface';
import { TypeRmqMiddleware } from './middleware.interface';

export type IConsumeFunction = (
  message?: any,
  consumeMessage?: ConsumeMessage,
) => any | void;
export interface MetaTegEnpoint {
  handler: IConsumeFunction;
  serdes?: ISerDes | undefined;
  interceptors: CallbackFunctionVariadic[];
  middlewares: TypeRmqMiddleware[];
  validate: null;
}
export type IMetaTegsMap = Map<string, MetaTegEnpoint>;
export interface IDescriptorRoute {
  value?: IConsumeFunction;
}

export type CallbackFunctionVariadic = (...args: any[]) => any;
