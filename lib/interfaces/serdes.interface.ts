export interface ISerDes {
  deserialize: (message: Buffer) => any;
  serialize: (message: any) => Buffer;
}
