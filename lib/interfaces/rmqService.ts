import { ConsumeMessage } from 'amqplib';

export interface ImqService {
  readonly listenQueue: (msg: ConsumeMessage | null) => void;
}
