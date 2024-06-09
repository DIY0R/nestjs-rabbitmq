import { DynamicModule, Module, Provider } from '@nestjs/common';
import { RmqService } from './rmq-nestjs.service';
import { IRMQSRootAsyncOptions, RabbitMQConfig } from './interfaces/connection';
import { RMQ_CONNECT_OPTIONS } from './constants';
import { RmqNestjsCoreModule } from './rmq-nestjs-core.module';

@Module({})
export class RmqNestjsModule {
  static forRoot(options: RabbitMQConfig): DynamicModule {
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
  static forFeature(options: Record<string, any>): DynamicModule {
    return {
      module: RmqNestjsModule,
      providers: [RmqService],
      exports: [RmqService],
    };
  }
}
