import { DynamicModule, Module } from '@nestjs/common';
import { RmqService } from './rmq-nestjs.service';
import { RabbitMQConfig } from './interfaces/connection';
import { RMQ_CONNECT_OPTIONS } from './constants';

@Module({})
export class RmqNestjsModule {
  static forRoot(options: RabbitMQConfig): DynamicModule {
    return {
      module: RmqNestjsModule,
      providers: [{ provide: RMQ_CONNECT_OPTIONS, useValue: options }],
    };
  }
  static forFeature(options: Record<string, any>): DynamicModule {
    return {
      module: RmqNestjsModule,
      exports: [RmqService],
    };
  }
}
