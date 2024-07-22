import { ISerDes } from 'lib/interfaces';

export const serDes: ISerDes = {
  deserialize: (message: Buffer): any => JSON.parse(message.toString()),
  serialize: (message: any): Buffer => Buffer.from(JSON.stringify(message)),
};
