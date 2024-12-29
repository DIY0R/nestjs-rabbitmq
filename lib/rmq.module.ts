import { DynamicModule, Module, ModuleMetadata, Provider } from '@nestjs/common';
import { RmqService } from './rmq.service';
import { DiscoveryModule } from '@nestjs/core';
import { MetaTagsScannerService, RmqErrorService, extendedProvidersArr, getUniqId } from './common';
import { RmqNestjsCoreModule } from './rmq-core.module';
import {
  IModuleBroker,
  IModuleBrokerAsync,
  ImportsType,
  IRMQOptions,
  IRMQOptionsAsync,
} from './interfaces';
import { MODULE_TOKEN, RMQ_BROKER_OPTIONS } from './constants';

@Module({
  providers: [{ provide: MODULE_TOKEN, useFactory: getUniqId }],
})
export class RmqModule {
  static forRoot(RMQOptions: IRMQOptions): DynamicModule {
    return {
      module: RmqModule,
      imports: [RmqNestjsCoreModule.forRoot(RMQOptions)],
    };
  }

  static forRootAsync(RMQOptionsAsync: IRMQOptionsAsync): DynamicModule {
    return {
      module: RmqModule,
      imports: [RmqNestjsCoreModule.forRootAsync(RMQOptionsAsync)],
    };
  }

  static forFeature(options: IModuleBroker): DynamicModule {
    const providerOptions = { provide: RMQ_BROKER_OPTIONS, useValue: options };
    const providersExtended = extendedProvidersArr(options);
    return this.generateForFeature(providerOptions, providersExtended);
  }

  static forFeatureAsync(options: IModuleBrokerAsync): DynamicModule {
    const providerOptions = {
      provide: RMQ_BROKER_OPTIONS,
      useFactory: async (...args: any[]) => await options.useFactory(...args),
      inject: options.inject || [],
    };
    const providersExtended = extendedProvidersArr(options);
    return this.generateForFeature(providerOptions, providersExtended, options.imports);
  }

  private static generateForFeature(
    providerOptions: Provider,
    providersExtended: Provider[],
    imports: ImportsType = [],
  ): DynamicModule {
    return {
      module: RmqModule,
      imports: [DiscoveryModule, ...imports],
      providers: [providerOptions, RmqService, MetaTagsScannerService, RmqErrorService].concat(
        providersExtended,
      ),
      exports: [RmqService],
    };
  }
}
