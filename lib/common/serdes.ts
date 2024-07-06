import { ISerDes } from 'lib/interfaces';

export const serDes: ISerDes = {
  deserialize: (message: Buffer): any => JSON.parse(message.toString()),
  serializer: (message: any): Buffer => Buffer.from(JSON.stringify(message)),
};
