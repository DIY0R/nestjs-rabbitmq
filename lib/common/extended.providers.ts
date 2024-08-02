import { ClassProvider, Provider, Type, ValueProvider } from '@nestjs/common';
import { getUniqId } from './get-uniqId';
import { INTERCEPTORS, MIDDLEWARES, SERDES } from '../constants';
import { IExtendedBroker } from '..//interfaces';
import { defaultSerDes } from './serdes';

export const extendedProvidersArr = <T>(
  extendedOptions: IExtendedBroker,
): Provider[] => {
  const { interceptors = [], middlewares = [], serDes } = extendedOptions;
  const interceptorProviders: ClassProvider[] = interceptors.map(
    (useClass) => ({
      provide: getUniqId(),
      useClass: useClass as Type<T>,
    }),
  );
  const interceptorsProvider: ValueProvider = {
    provide: INTERCEPTORS,
    useValue: interceptorProviders.map((provider) => provider.provide),
  };
  return [
    { provide: SERDES, useValue: serDes ?? defaultSerDes },
    { provide: MIDDLEWARES, useValue: middlewares ?? [] },
    interceptorsProvider,
    ...interceptorProviders,
  ];
};
