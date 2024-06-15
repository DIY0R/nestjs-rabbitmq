import { RMQ_MESSAGE_META_TEG } from 'lib/constants';

export function RMQMessage(event: string) {
  return function (target: any, propertyKey: string | symbol, descriptor: any) {
    Reflect.defineMetadata(RMQ_MESSAGE_META_TEG, event, descriptor.value);
  };
}
