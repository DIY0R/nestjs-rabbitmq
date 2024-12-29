import { UseInterceptors } from '@nestjs/common';
import { TypeRmqInterceptor } from 'lib/interfaces';

export const RmqInterceptor = (interceptors: TypeRmqInterceptor) => UseInterceptors(interceptors);
