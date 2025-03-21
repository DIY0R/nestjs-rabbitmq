import { Injectable, InjectionToken } from '@nestjs/common';
import { ModulesContainer, Reflector, MetadataScanner } from '@nestjs/core';
import { Module } from '@nestjs/core/injector/module';
import { Injectable as InjectableInterface } from '@nestjs/common/interfaces';
import { InstanceWrapper } from '@nestjs/core/injector/instance-wrapper';
import {
  INTERCEPTOR_CUSTOM_METADATA,
  MESSAGE_ROUTER,
  MIDDLEWARES_METADATA,
  MODULE_TOKEN,
  RMQ_VALIDATE,
  SER_DAS_KEY,
} from '../constants';
import {
  CallbackFunctionVariadic,
  IMetaTagsMap,
  IRmqInterceptor,
  ISerDes,
  TypeRmqInterceptor,
  TypeRmqMiddleware,
} from '../interfaces';
import { RQMColorLogger } from './logger';

@Injectable()
export class MetaTagsScannerService {
  private logger = new RQMColorLogger(false);
  constructor(
    private readonly metadataScanner: MetadataScanner,
    private readonly reflector: Reflector,
    private readonly modulesContainer: ModulesContainer,
  ) {}

  public findModulesByProviderValue(tokenValue: string): Module {
    for (const module of this.modulesContainer.values()) {
      for (const importedModule of module.imports.values()) {
        const provider = importedModule.providers.get(MODULE_TOKEN);
        if (provider && provider.instance === tokenValue) return module;
      }
    }
    return null;
  }

  public scan(metaTag: string, tokenValue: string) {
    const rmqMessagesMap: IMetaTagsMap = new Map();
    const currentModule = this.findModulesByProviderValue(tokenValue);
    if (!currentModule) return rmqMessagesMap;
    const providersAndControllers = this.getProvidersAndControllers(currentModule);
    providersAndControllers.forEach((provider: InstanceWrapper) => {
      const { instance } = provider;
      if (instance instanceof Object) {
        const allMethodNames = this.metadataScanner.getAllMethodNames(instance);
        allMethodNames.forEach((name: string) =>
          this.lookupMethods(metaTag, rmqMessagesMap, instance, name, currentModule.injectables),
        );
      }
    });
    return rmqMessagesMap;
  }

  private getProvidersAndControllers(module: Module) {
    return [...module.providers.values(), ...module.controllers.values()];
  }

  private lookupMethods(
    metaTag: string,
    rmqMessagesMap: IMetaTagsMap,
    instance: object,
    methodName: string,
    injectables: Map<InjectionToken, InstanceWrapper<InjectableInterface>>,
  ) {
    const method = instance[methodName];
    const event = this.getMetaData<string>(metaTag, method);
    if (event) {
      const boundHandler = method.bind(instance);
      const serdes = this.getSerDesMetaData(method, instance.constructor);
      const middlewares = this.getLinesMetaDate<TypeRmqMiddleware>(
        method,
        instance.constructor,
        MIDDLEWARES_METADATA,
      );
      const interceptors = this.getInterceptors(injectables, method, instance.constructor);
      const validate = this.getValidation(instance, method);
      rmqMessagesMap.set(event, {
        handler: boundHandler,
        serdes,
        interceptors,
        middlewares,
        validate,
      });
      this.logger.log('Mapped ' + event, MESSAGE_ROUTER);
    }
  }

  private getSerDesMetaData(method: CallbackFunctionVariadic, target: object) {
    return (
      this.getMetaData<ISerDes>(SER_DAS_KEY, method) ||
      this.getMetaData<ISerDes>(SER_DAS_KEY, target)
    );
  }

  private getLinesMetaDate<T>(
    method: CallbackFunctionVariadic,
    classProvider: Record<string, any>,
    key: string,
  ): T[] {
    const methodMeta = this.getMetaData<T>(key, method);
    const targetMeta = this.getMetaData<T>(key, classProvider);
    return [targetMeta, methodMeta].filter(meta => meta !== undefined);
  }

  private getInterceptors(
    injectables: Map<any, any>,
    method: CallbackFunctionVariadic,
    classProvider: Record<string, any>,
  ) {
    const interceptors = this.getLinesMetaDate<TypeRmqInterceptor[]>(
      method,
      classProvider,
      INTERCEPTOR_CUSTOM_METADATA,
    );
    return interceptors.map(interceptor => {
      const instance: IRmqInterceptor = injectables.get(interceptor[0]).instance;
      return instance.intercept.bind(instance);
    });
  }

  private getValidation(instance: Record<string, any>, method: CallbackFunctionVariadic) {
    const validator = this.reflector.get(RMQ_VALIDATE, method);
    if (!validator) return null;
    const paramTypes = Reflect.getMetadata(
      'design:paramtypes',
      Object.getPrototypeOf(instance),
      method.name,
    );
    return paramTypes[0];
  }

  private getMetaData<T>(key: string, target: any) {
    return this.reflector.get<T>(key, target);
  }
}
