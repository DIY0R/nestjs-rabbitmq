import { ConsumeMessage } from 'amqplib';
import { ISerDes } from './serdes.interface';

export type IConsumFunction = (
  message?: any,
  consumeMessage?: ConsumeMessage,
) => any | void;
export interface MetaTegEnpoint {
  handler: IConsumFunction;
  serdes?: ISerDes | undefined;
}
export type IMetaTegsMap = Map<string, MetaTegEnpoint>;
export interface IDescriptor {
  value?: IConsumFunction;
}

export type CallbackFunctionVariadic = (...args: any[]) => any;
