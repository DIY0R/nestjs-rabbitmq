import { DynamicModule, Module, Global } from '@nestjs/common';
import { RMQ_APP_OPTIONS, RMQ_CONNECT_OPTIONS } from './constants';
import { IRMQSRootAsyncOptions, IRabbitMQConfig } from './interfaces';
import { RmqNestjsConnectService } from './rmq-connect.service';
import { IAppOptions } from './interfaces/app-options.interface';

@Global()
@Module({})
export class RmqNestjsCoreModule {
  static forRoot(
    options: IRabbitMQConfig,
    appOptions?: IAppOptions,
  ): DynamicModule {
    return {
      module: RmqNestjsCoreModule,
      providers: [
        { provide: RMQ_CONNECT_OPTIONS, useValue: options },
        { provide: RMQ_APP_OPTIONS, useValue: appOptions || {} },
        RmqNestjsConnectService,
      ],
      exports: [RmqNestjsConnectService, RMQ_APP_OPTIONS],
    };
  }
  static forRootAsync(
    options: IRMQSRootAsyncOptions,
    appOptions?: IAppOptions,
  ): DynamicModule {
    return {
      module: RmqNestjsCoreModule,
      imports: options.imports,
      providers: [
        {
          provide: RMQ_CONNECT_OPTIONS,
          useFactory: async (...args: any[]) =>
            await options.useFactory(...args),
          inject: options.inject || [],
        },
        { provide: RMQ_APP_OPTIONS, useValue: appOptions || {} },
        RmqNestjsConnectService,
      ],
      exports: [RmqNestjsConnectService, RMQ_APP_OPTIONS],
    };
  }
}
