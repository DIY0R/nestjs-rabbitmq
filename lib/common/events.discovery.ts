import { Injectable } from '@nestjs/common';
import { ModulesContainer, Reflector } from '@nestjs/core';
import { MetadataScanner } from '@nestjs/core';
import { InstanceWrapper } from '@nestjs/core/injector/instance-wrapper';
import {
  INTERCEPTOR_KEY,
  MESSAGE_ROUTER,
  MIDDLEWARE_KEY,
  MODULE_TOKEN,
  SER_DAS_KEY,
} from '../constants';
import {
  CallbackFunctionVariadic,
  IMetaTegsMap,
  ISerDes,
  TypeRmqInterceptor,
  TypeRmqMiddleware,
} from '../interfaces';
import { RQMColorLogger } from './logger';
import { Module } from '@nestjs/core/injector/module';

@Injectable()
export class MetaTegsScannerService {
  private logger = new RQMColorLogger(false);
  constructor(
    private readonly metadataScanner: MetadataScanner,
    private readonly reflector: Reflector,
    private readonly modulesContainer: ModulesContainer,
  ) {}
  public findModulesByProviderValue(tokenValue: string): Module {
    for (const module of this.modulesContainer.values())
      for (const importedModule of module.imports.values()) {
        const provider = importedModule.providers.get(MODULE_TOKEN);
        if (provider && provider.instance === tokenValue) return module;
      }
    return null;
  }

  public scan(metaTeg: string, tokenValue: string) {
    const rmqMessagesMap: IMetaTegsMap = new Map();
    const currentModule = this.findModulesByProviderValue(tokenValue);
    if (!currentModule) return rmqMessagesMap;
    const providersAndControllers =
      this.getProvidersAndControllers(currentModule);

    providersAndControllers.forEach((provider: InstanceWrapper) => {
      const { instance } = provider;
      if (instance instanceof Object) {
        const allMethodNames = this.metadataScanner.getAllMethodNames(instance);
        allMethodNames.forEach((name: string) =>
          this.lookupMethods(metaTeg, rmqMessagesMap, instance, name),
        );
      }
    });
    return rmqMessagesMap;
  }

  private getProvidersAndControllers(module: Module) {
    return [...module.providers.values(), ...module.controllers.values()];
  }
  private lookupMethods(
    metaTeg: string,
    rmqMessagesMap: IMetaTegsMap,
    instance: object,
    methodName: string,
  ) {
    const method = instance[methodName];
    const event = this.getMetaData<string>(metaTeg, method);
    const boundHandler = instance[methodName].bind(instance);
    if (event) {
      const serdes = this.getSerDesMetaData(method, instance.constructor);
      const middlewares = this.getLinesMetaDates<TypeRmqMiddleware>(
        method,
        instance.constructor,
        MIDDLEWARE_KEY,
      );
      const interceptors = this.getLinesMetaDates<TypeRmqInterceptor>(
        method,
        instance.constructor,
        INTERCEPTOR_KEY,
      );
      rmqMessagesMap.set(event, {
        handler: boundHandler,
        serdes,
        interceptors,
        middlewares,
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
  private getInterceptorMetaData(
    method: CallbackFunctionVariadic,
    target: object,
  ): TypeRmqInterceptor[] {
    const methodMeta = this.getMetaData<TypeRmqInterceptor>(
      INTERCEPTOR_KEY,
      method,
    );
    const targetMeta = this.getMetaData<TypeRmqInterceptor>(
      INTERCEPTOR_KEY,
      target,
    );
    return [targetMeta, methodMeta].filter((meta) => meta !== undefined);
  }
  private getLinesMetaDates<T>(
    method: CallbackFunctionVariadic,
    target: object,
    key: string,
  ): T[] {
    const methodMeta = this.getMetaData<T>(key, method);
    const targetMeta = this.getMetaData<T>(key, target);
    return [targetMeta, methodMeta].filter((meta) => meta !== undefined);
  }
  private getMetaData<T>(key: string, target: any) {
    return this.reflector.get<T>(key, target);
  }
}
