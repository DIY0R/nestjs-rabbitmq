export interface ISerDes {
  deserialize: (message: Buffer) => any;
  serializer: (message: any) => Buffer;
}
