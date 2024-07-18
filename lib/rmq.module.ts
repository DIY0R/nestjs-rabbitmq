import { DynamicModule, Module } from '@nestjs/common';
import { RmqService } from './rmq.service';
import {
  IMessageBroker,
  IRabbitMQConfigAsync,
  IRabbitMQConfig,
  IGlobalOptions,
} from './interfaces';
import {
  INTERCEPTORS,
  MIDDLEWARES,
  MODULE_TOKEN,
  RMQ_BROKER_OPTIONS,
  SERDES,
} from './constants';
import { DiscoveryModule } from '@nestjs/core';
import { MetaTegsScannerService, getUniqId } from './common';
import { RmqNestjsCoreModule } from './rmq-core.module';
import { serDes } from './common';

@Module({
  providers: [{ provide: MODULE_TOKEN, useFactory: getUniqId }],
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
    return {
      module: RmqModule,
      imports: [DiscoveryModule],
      providers: [
        { provide: RMQ_BROKER_OPTIONS, useValue: options },
        { provide: SERDES, useValue: options.serDes ?? serDes },
        { provide: INTERCEPTORS, useValue: options.interceptor ?? [] },
        { provide: MIDDLEWARES, useValue: options.middlewares ?? [] },
        RmqService,
        MetaTegsScannerService,
      ],
      exports: [RmqService],
    };
  }
}
