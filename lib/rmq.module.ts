import { DynamicModule, Module, Provider } from '@nestjs/common';
import { RmqService } from './rmq.service';
import { DiscoveryModule } from '@nestjs/core';
import {
  MetaTegsScannerService,
  RmqErrorService,
  extendedProvidersArr,
  getUniqId,
} from './common';
import { RmqNestjsCoreModule } from './rmq-core.module';
import {
  IModuleBroker,
  IModuleBrokerAsync,
  IRMQOptions,
  IRMQOptionsAsync,
} from './interfaces';
import { MODULE_TOKEN, RMQ_BROKER_OPTIONS } from './constants';

@Module({
  providers: [{ provide: MODULE_TOKEN, useFactory: getUniqId }],
})
export class RmqModule {
  static forRoot(rmQoptions: IRMQOptions): DynamicModule {
    return {
      module: RmqModule,
      imports: [RmqNestjsCoreModule.forRoot(rmQoptions)],
    };
  }
  static forRootAsync(rmQoptionsAsync: IRMQOptionsAsync): DynamicModule {
    return {
      module: RmqModule,
      imports: [RmqNestjsCoreModule.forRootAsync(rmQoptionsAsync)],
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
    const interceptors = extendedProvidersArr(options);
    return this.generateForFeature(providerOptions, interceptors);
  }
  private static generateForFeature(
    providerOptions: Provider,
    providersExtended: Provider[],
  ): DynamicModule {
    return {
      module: RmqModule,
      imports: [DiscoveryModule],
      providers: [
        providerOptions,
        RmqService,
        MetaTegsScannerService,
        RmqErrorService,
      ].concat(providersExtended),
      exports: [RmqService],
    };
  }
}
