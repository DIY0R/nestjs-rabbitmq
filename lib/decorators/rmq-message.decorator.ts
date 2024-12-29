import { IDescriptorRoute } from 'lib/interfaces';
import { NON_ROUTE, RMQ_MESSAGE_META_TAG } from '../constants';

export const reflectFunction = (event: string) =>
  function (target: any, propertyKey: string | symbol, descriptor: IDescriptorRoute) {
    Reflect.defineMetadata(RMQ_MESSAGE_META_TAG, event, descriptor.value);
  };

export function MessageRoute(event: string) {
  return reflectFunction(event);
}
export function MessageNonRoute() {
  return reflectFunction(NON_ROUTE);
}
