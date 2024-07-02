import { ConsumeMessage } from 'amqplib';

export type IConsumFunction = (
  message?: any,
  consumeMessage?: ConsumeMessage,
) => any | void;
export type IMetaTegsMap = Map<string, IConsumFunction>;
export interface IDescriptor {
  value?: IConsumFunction;
}
