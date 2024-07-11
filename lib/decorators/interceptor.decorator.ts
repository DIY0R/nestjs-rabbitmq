import { SetMetadata } from '@nestjs/common';
import { INTERCEPTOR_KEY } from '../constants';
import { IRmqInterceptor } from 'lib/interfaces';

export const RmqInterceptor = (options: typeof IRmqInterceptor) =>
  SetMetadata(INTERCEPTOR_KEY, options);
