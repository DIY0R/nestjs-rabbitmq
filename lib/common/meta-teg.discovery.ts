import { Inject, Injectable } from '@nestjs/common';
import { ModulesContainer, Reflector } from '@nestjs/core';
import { MetadataScanner } from '@nestjs/core';
import { InstanceWrapper } from '@nestjs/core/injector/instance-wrapper';
import { TARGET_MODULE } from '../constants';
import { IMetaTegsMap } from '../interfaces';

@Injectable()
export class MetaTegsScannerService {
  constructor(
    private readonly metadataScanner: MetadataScanner,
    private readonly reflector: Reflector,
    private readonly modulesContainer: ModulesContainer,
    @Inject(TARGET_MODULE) private readonly targetModuleName: string,
  ) {}

  public scan(metaTeg: string) {
    const rmqMessagesMap = new Map();
    const modules = [...this.modulesContainer.values()];

    const currentModule = modules.find(
      (module) => module.metatype?.name === this.targetModuleName,
    );
    if (!currentModule) return rmqMessagesMap;
    const providers = [...currentModule.providers.values()];
    const controllers = [...currentModule.controllers.values()];
    [...providers, ...controllers].forEach((provider: InstanceWrapper) => {
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
    if (event) rmqMessagesMap.set(event, boundHandler);
  }
}
