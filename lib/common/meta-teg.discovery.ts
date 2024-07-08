import { Injectable } from '@nestjs/common';
import { ModulesContainer, Reflector } from '@nestjs/core';
import { MetadataScanner } from '@nestjs/core';
import { InstanceWrapper } from '@nestjs/core/injector/instance-wrapper';
import { MESSAGE_ROUTER, MODULE_TOKEN, SER_DAS_KEY } from '../constants';
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
      this.metadataScanner
        .getAllMethodNames(instance)
        .forEach((name: string) =>
          this.lookupMethods(metaTeg, rmqMessagesMap, instance, name),
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
    methodName: string,
  ) {
    const method = instance[methodName];
    const event = this.reflector.get<string>(metaTeg, method);
    const boundHandler = instance[methodName].bind(instance);
    if (event) {
      const serdes = this.reflector.get<ISerDes>(SER_DAS_KEY, method);
      rmqMessagesMap.set(event, { handler: boundHandler, serdes });
      this.logger.log('Mapped ' + event, MESSAGE_ROUTER);
    }
  }
}
