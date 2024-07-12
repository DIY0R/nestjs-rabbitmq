import { SetMetadata } from '@nestjs/common';
import { INTERCEPTOR_KEY } from '../constants';
import { TypeRmqInterceptor } from 'lib/interfaces';

export const RmqInterceptor = (options: TypeRmqInterceptor) =>
  SetMetadata(INTERCEPTOR_KEY, options);
