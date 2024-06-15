import { DynamicModule, Module, Global } from '@nestjs/common';
import { RmqNestjsConnectService } from './rmq-nestjs-connect.service';
import { RMQ_CONNECT_OPTIONS } from './constants';
import { IRMQSRootAsyncOptions, IRabbitMQConfig } from './interfaces';

@Global()
@Module({})
export class RmqNestjsCoreModule {
  static forRoot(options: IRabbitMQConfig): DynamicModule {
    return {
      module: RmqNestjsCoreModule,
      providers: [
        { provide: RMQ_CONNECT_OPTIONS, useValue: options },
        RmqNestjsConnectService,
      ],
      exports: [RmqNestjsConnectService],
    };
  }
  static forRootAsync(options: IRMQSRootAsyncOptions): DynamicModule {
    return {
      module: RmqNestjsCoreModule,
      imports: options.imports,
      providers: [
        {
          provide: RMQ_CONNECT_OPTIONS,
          useFactory: async (...args: any[]) => {
            const config = await options.useFactory(...args);
            return config;
          },
          inject: options.inject || [],
        },
        RmqNestjsConnectService,
      ],
      exports: [RmqNestjsConnectService],
    };
  }
}
