import { LoggerService } from '@nestjs/common';
import { RMQIntercepterClass, RMQPipeClass } from '../common';

export interface IAppOptions {
  logger?: LoggerService;
  globalMiddleware?: (typeof RMQPipeClass)[];
  globalIntercepters?: (typeof RMQIntercepterClass)[];
  errorHandler?: object;
  serviceName?: string;
  logMessages: boolean;
}
