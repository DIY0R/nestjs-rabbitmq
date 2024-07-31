import { ClassProvider, Provider, Type, ValueProvider } from '@nestjs/common';
import { getUniqId } from './get-uniqId';
import { INTERCEPTORS } from '../../lib/constants';

type AbstractConstructor<T> = abstract new (...args: any[]) => T;

export const providersInjectionArr = <T>(
  interceptors: AbstractConstructor<T>[] = [],
): Provider[] => {
  const interceptorProviders: ClassProvider[] = interceptors.map(
    (useClass) => ({ provide: getUniqId(), useClass: useClass as Type<T> }),
  );
  const interceptorsProvider: ValueProvider = {
    provide: INTERCEPTORS,
    useValue: interceptorProviders.map((provider) => provider.provide),
  };
  return [interceptorsProvider, ...interceptorProviders];
};
