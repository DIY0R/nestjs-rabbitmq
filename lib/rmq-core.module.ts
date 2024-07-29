import { DynamicModule, Module, Global } from '@nestjs/common';
import { RMQ_APP_OPTIONS, RMQ_CONNECT_OPTIONS, SERDES } from './constants';
import {
  IRabbitMQConfigAsync,
  IRabbitMQConfig,
  IGlobalOptions,
} from './interfaces';
import { RmqNestjsConnectService } from './rmq-connect.service';
import { RmqGlobalService } from './rmq.global.service';
import { RmqErrorGlobalService, serDes } from './common';

@Global()
@Module({
  providers: [RmqErrorGlobalService],
})
export class RmqNestjsCoreModule {
  static forRoot(
    configOptions: IRabbitMQConfig,
    globalOptions?: IGlobalOptions,
  ): DynamicModule {
    return {
      module: RmqNestjsCoreModule,
      providers: [
        { provide: RMQ_CONNECT_OPTIONS, useValue: configOptions },
        { provide: RMQ_APP_OPTIONS, useValue: globalOptions || {} },
        {
          provide: SERDES,
          useValue: globalOptions?.globalBroker?.serDes ?? serDes,
        },
        RmqNestjsConnectService,
        RmqGlobalService,
      ],
      exports: [RmqNestjsConnectService, RmqGlobalService, RMQ_APP_OPTIONS],
    };
  }
  static forRootAsync(
    configOptions: IRabbitMQConfigAsync,
    globalOptions?: IGlobalOptions,
  ): DynamicModule {
    return {
      module: RmqNestjsCoreModule,
      imports: configOptions.imports,
      providers: [
        {
          provide: RMQ_CONNECT_OPTIONS,
          useFactory: async (...args: any[]) =>
            await configOptions.useFactory(...args),
          inject: configOptions.inject || [],
        },
        { provide: RMQ_APP_OPTIONS, useValue: globalOptions || {} },
        {
          provide: SERDES,
          useValue: globalOptions?.globalBroker?.serDes ?? serDes,
        },
        RmqNestjsConnectService,
        RmqGlobalService,
      ],
      exports: [RmqNestjsConnectService, RmqGlobalService, RMQ_APP_OPTIONS],
    };
  }
}
