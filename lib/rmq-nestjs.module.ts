import { DynamicModule, Module, Provider } from '@nestjs/common';
import { RmqService } from './rmq-nestjs.service';
import {
  IMessageBroker,
  IRMQSRootAsyncOptions,
  IRabbitMQConfig,
} from './interfaces/connection';
import { RMQ_BROKER_OPTIONS, RMQ_CONNECT_OPTIONS } from './constants';
import { RmqNestjsCoreModule } from './rmq-nestjs-core.module';
import { RmqNestjsConnectService } from './rmq-nestjs-connect.service';

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
      providers: [
        { provide: RMQ_BROKER_OPTIONS, useValue: options },
        RmqService,
      ],
      exports: [RmqService],
    };
  }
}
