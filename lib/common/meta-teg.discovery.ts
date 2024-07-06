import { Injectable } from '@nestjs/common';
import { ModulesContainer, Reflector } from '@nestjs/core';
import { MetadataScanner } from '@nestjs/core';
import { InstanceWrapper } from '@nestjs/core/injector/instance-wrapper';
import {
  MESSAGE_ROUTER,
  MODULE_TOKEN,
  SER_DAS_KEY,
  TARGET_MODULE,
} from '../constants';
import { IMetaTegsMap, ISerDes } from '../interfaces';
import { RQMColorLogger } from './logger';
import { Module } from '@nestjs/core/injector/module';

@Injectable()
export class MetaTegsScannerService {
  logger = new RQMColorLogger(false);
  constructor(
    private readonly metadataScanner: MetadataScanner,
    private readonly reflector: Reflector,
    private readonly modulesContainer: ModulesContainer,
  ) {}
  public findModulesByProviderValue(tokenValue: string): Module {
    for (const module of this.modulesContainer.values()) {
      const importsModules: Module[] = [...module.imports.values()];
      for (const importedModule of importsModules) {
        const provider = importedModule.providers.get(MODULE_TOKEN);
        if (provider && provider.instance === tokenValue) return module;
      }
    }
    return null;
  }
  public scan(metaTeg: string, tokenValue: string) {
    const rmqMessagesMap = new Map();
    const currentModule = this.findModulesByProviderValue(tokenValue);
    if (!currentModule) return rmqMessagesMap;

    const providersAndControllers =
      this.getProvidersAndControllers(currentModule);

    providersAndControllers.forEach((provider: InstanceWrapper) => {
      const { instance } = provider;

      const prototype = Object.getPrototypeOf(instance);
      this.metadataScanner
        .getAllMethodNames(prototype)
        .forEach((name: string) =>
          this.lookupMethods(
            metaTeg,
            rmqMessagesMap,
            instance,
            prototype,
            name,
          ),
        );
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
    prototype: object,
    methodName: string,
  ) {
    const method = prototype[methodName];
    const event = this.reflector.get<string>(metaTeg, method);
    const boundHandler = instance[methodName].bind(instance);
    if (event) {
      const serdesData = this.reflector.get<ISerDes>(SER_DAS_KEY, method);
      rmqMessagesMap.set(event, { handler: boundHandler, serdes: serdesData });
      this.logger.log('Mapped ' + event, MESSAGE_ROUTER);
    }
  }
}
