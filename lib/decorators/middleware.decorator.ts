import { SetMetadata } from '@nestjs/common';
import { MIDDLEWARE_KEY } from '../constants';
import { TypeRmqMiddleware } from 'lib/interfaces';

export const RmqMiddleware = (options: TypeRmqMiddleware) =>
  SetMetadata(MIDDLEWARE_KEY, options);
