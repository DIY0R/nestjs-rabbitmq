import { RMQ_MESSAGE_META_TEG } from '../constants';

export function RMQEvent(event: string) {
  return function (target: any, propertyKey: string | symbol, descriptor: any) {
    Reflect.defineMetadata(RMQ_MESSAGE_META_TEG, event, descriptor.value);
  };
}
