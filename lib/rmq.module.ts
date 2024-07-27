import { DynamicModule, Module } from '@nestjs/common';
import { RmqService } from './rmq.service';
import { DiscoveryModule } from '@nestjs/core';
import {
  MetaTegsScannerService,
  RmqErrorService,
  getUniqId,
  providersInjectionArr,
} from './common';
import { RmqNestjsCoreModule } from './rmq-core.module';
import { serDes } from './common';
import {
  IMessageBroker,
  IRabbitMQConfigAsync,
  IRabbitMQConfig,
  IGlobalOptions,
} from './interfaces';
import {
  MIDDLEWARES,
  MODULE_TOKEN,
  RMQ_BROKER_OPTIONS,
  SERDES,
} from './constants';

@Module({
  providers: [
    { provide: MODULE_TOKEN, useFactory: getUniqId },
    RmqErrorService,
  ],
})
export class RmqModule {
  static forRoot(
    configOptions: IRabbitMQConfig,
    globalOptions?: IGlobalOptions,
  ): DynamicModule {
    return {
      module: RmqModule,
      imports: [RmqNestjsCoreModule.forRoot(configOptions, globalOptions)],
    };
  }
  static forRootAsync(
    configOptions: IRabbitMQConfigAsync,
    globalOptions?: IGlobalOptions,
  ): DynamicModule {
    return {
      module: RmqModule,
      imports: [RmqNestjsCoreModule.forRootAsync(configOptions, globalOptions)],
    };
  }

  static forFeature(options: IMessageBroker): DynamicModule {
    const interceptors = providersInjectionArr(options.interceptor);
    return {
      module: RmqModule,
      imports: [DiscoveryModule],
      providers: [
        { provide: RMQ_BROKER_OPTIONS, useValue: options },
        { provide: SERDES, useValue: options.serDes ?? serDes },
        { provide: MIDDLEWARES, useValue: options.middlewares ?? [] },
        ...interceptors,
        RmqService,
        MetaTegsScannerService,
      ],
      exports: [RmqService],
    };
  }
}
