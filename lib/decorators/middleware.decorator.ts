import { SetMetadata } from '@nestjs/common';
import { MIDDLEWARES_METADATA } from '../constants';
import { TypeRmqMiddleware } from 'lib/interfaces';

export const RmqMiddleware = (options: TypeRmqMiddleware) =>
  SetMetadata(MIDDLEWARES_METADATA, options);
