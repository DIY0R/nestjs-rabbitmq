import { SetMetadata } from '@nestjs/common';
import { RMQ_VALIDATE } from '../constants';

export const RMQValidate = () => SetMetadata(RMQ_VALIDATE, true);
