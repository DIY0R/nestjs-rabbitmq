import { DynamicModule, Module, Global } from '@nestjs/common';
import { RmqNestjsConnectService } from './rmq-nestjs-connect.service';
import { RMQ_CONNECT_OPTIONS } from './constants';
import { RabbitMQConfig } from './interfaces/connection';

@Global()
@Module({})
export class RmqNestjsCoreModule {
  static forRoot(options: RabbitMQConfig): DynamicModule {
    return {
      module: RmqNestjsCoreModule,
      providers: [
        { provide: RMQ_CONNECT_OPTIONS, useValue: options },
        RmqNestjsConnectService,
      ],
      exports: [RmqNestjsConnectService],
    };
  }
}
