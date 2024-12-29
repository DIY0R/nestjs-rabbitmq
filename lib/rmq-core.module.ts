import { DynamicModule, Module, Global } from '@nestjs/common';
import { RMQ_OPTIONS } from './constants';
import { IRMQOptions, IRMQOptionsAsync } from './interfaces';
import { RmqNestjsConnectService } from './rmq-connect.service';
import { RmqGlobalService } from './rmq.global.service';
import { RmqErrorGlobalService } from './common';

@Global()
@Module({
  providers: [RmqErrorGlobalService],
})
export class RmqNestjsCoreModule {
  static forRoot(RMQOptions: IRMQOptions): DynamicModule {
    return {
      module: RmqNestjsCoreModule,
      providers: [
        { provide: RMQ_OPTIONS, useValue: RMQOptions },
        RmqNestjsConnectService,
        RmqGlobalService,
      ],
      exports: [RmqNestjsConnectService, RmqGlobalService, RMQ_OPTIONS],
    };
  }

  static forRootAsync(RMQOptionsAsync: IRMQOptionsAsync): DynamicModule {
    return {
      module: RmqNestjsCoreModule,
      imports: RMQOptionsAsync.imports,
      providers: [
        {
          provide: RMQ_OPTIONS,
          useFactory: async (...args: any[]) => await RMQOptionsAsync.useFactory(...args),
          inject: RMQOptionsAsync.inject || [],
        },
        RmqNestjsConnectService,
        RmqGlobalService,
      ],
      exports: [RmqNestjsConnectService, RmqGlobalService, RMQ_OPTIONS],
    };
  }
}
