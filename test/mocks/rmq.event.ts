import { Injectable, Logger } from '@nestjs/common';
import { MessageNonRoute, MessageRoute, SerDes } from '../../lib/decorators/';
import { RmqService } from '../../lib';
import { ConsumeMessage } from 'amqplib';

@Injectable()
export class RmqEvents {
  constructor(private readonly rmqServie: RmqService) {}
  @MessageRoute('text.text')
  recived(obj: any, consumeMessage: ConsumeMessage) {
    this.rmqServie.ack(consumeMessage);
    return { message: obj };
  }
  @MessageRoute('text.nothing')
  recivedReturnNoting(obj: any, consumeMessage: ConsumeMessage) {
    this.rmqServie.ack(consumeMessage);
  }

  @MessageRoute('*.rpc.*')
  @SerDes({
    deserialize: (message: Buffer): any => JSON.parse(message.toString()),
    serializer: (message: any): Buffer => Buffer.from(JSON.stringify(message)),
  })
  recivedTopic(obj: any, consumeMessage: ConsumeMessage) {
    this.rmqServie.ack(consumeMessage);
    return { message: obj };
  }

  @MessageRoute('*.rpc.mix.#')
  recivedMixTopic(obj: any, consumeMessage: ConsumeMessage) {
    this.rmqServie.ack(consumeMessage);
    return { message: obj };
  }
  @MessageRoute('global.rpc')
  recivedGlobal(obj: any, consumeMessage: ConsumeMessage) {
    this.rmqServie.ack(consumeMessage);

    return { message: obj };
  }
  @MessageRoute('rpc.#')
  recivedTopicPattern(obj: any, consumeMessage: ConsumeMessage) {
    this.rmqServie.ack(consumeMessage);
    return { message: obj };
  }
  @MessageRoute('notify.global')
  recivedTopicNotify(obj: any, consumeMessage: ConsumeMessage) {
    this.rmqServie.ack(consumeMessage);
    Logger.log(obj);
  }

  @MessageNonRoute()
  recivedNonRoute(obj: any, consumeMessage: ConsumeMessage) {
    this.rmqServie.ack(consumeMessage);
    return { message: obj };
  }
}
