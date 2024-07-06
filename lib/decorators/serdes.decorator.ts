import { SetMetadata } from '@nestjs/common';
import { SER_DAS_KEY } from '../constants';
import { ISerDes } from '../interfaces';

export const SerDes = (options: ISerDes) => SetMetadata(SER_DAS_KEY, options);
