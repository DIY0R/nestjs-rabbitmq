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
  static forRoot(rmQoptions: IRMQOptions): DynamicModule {
    return {
      module: RmqNestjsCoreModule,
      providers: [
        { provide: RMQ_OPTIONS, useValue: rmQoptions },
        RmqNestjsConnectService,
        RmqGlobalService,
      ],
      exports: [RmqNestjsConnectService, RmqGlobalService, RMQ_OPTIONS],
    };
  }
  static forRootAsync(rmQoptions: IRMQOptionsAsync): DynamicModule {
    return {
      module: RmqNestjsCoreModule,
      imports: rmQoptions.imports,
      providers: [
        {
          provide: RMQ_OPTIONS,
          useFactory: async (...args: any[]) =>
            await rmQoptions.useFactory(...args),
          inject: rmQoptions.inject || [],
        },
        RmqNestjsConnectService,
        RmqGlobalService,
      ],
      exports: [RmqNestjsConnectService, RmqGlobalService, RMQ_OPTIONS],
    };
  }
}
