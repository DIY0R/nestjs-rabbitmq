import { DynamicModule, Module, Provider } from '@nestjs/common';
import { RmqService } from './rmq-nestjs.service';
import {
  IMessageBroker,
  IRMQSRootAsyncOptions,
  IRabbitMQConfig,
} from './interfaces';
import { RMQ_BROKER_OPTIONS } from './constants';
import { RmqNestjsCoreModule } from './rmq-nestjs-core.module';
import { DiscoveryModule } from '@nestjs/core';
import { MetaTegsScannerService } from './common';

@Module({})
export class RmqNestjsModule {
  static forRoot(options: IRabbitMQConfig): DynamicModule {
    return {
      module: RmqNestjsModule,
      imports: [RmqNestjsCoreModule.forRoot(options)],
    };
  }
  static forRootAsync(options: IRMQSRootAsyncOptions): DynamicModule {
    return {
      module: RmqNestjsModule,
      imports: [RmqNestjsCoreModule.forRootAsync(options)],
    };
  }
  static forFeature(options: IMessageBroker): DynamicModule {
    return {
      module: RmqNestjsModule,
      imports: [DiscoveryModule],
      providers: [
        { provide: RMQ_BROKER_OPTIONS, useValue: options },
        { provide: 'TARGET_MODULE', useValue: options.targetModuleName },
        RmqService,
        MetaTegsScannerService,
      ],
      exports: [RmqService, MetaTegsScannerService],
    };
  }
}
