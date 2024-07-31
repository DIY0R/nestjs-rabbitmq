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
import { defaultSerDes } from './common';
import { IMessageBroker, IRMQOptions, IRMQOptionsAsync } from './interfaces';
import {
  MIDDLEWARES,
  MODULE_TOKEN,
  RMQ_BROKER_OPTIONS,
  SERDES,
} from './constants';

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

  static forFeature(options: IMessageBroker): DynamicModule {
    const interceptors = providersInjectionArr(options.interceptor);
    return {
      module: RmqModule,
      imports: [DiscoveryModule],
      providers: [
        { provide: RMQ_BROKER_OPTIONS, useValue: options },
        { provide: SERDES, useValue: options.serDes ?? defaultSerDes },
        { provide: MIDDLEWARES, useValue: options.middlewares ?? [] },
        ...interceptors,
        RmqService,
        MetaTegsScannerService,
        RmqErrorService,
      ],
      exports: [RmqService],
    };
  }
}
