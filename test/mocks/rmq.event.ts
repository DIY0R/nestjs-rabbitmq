import { Injectable, Logger } from '@nestjs/common';
import {
  MessageNonRoute,
  MessageRoute,
} from '../../lib/decorators/rmq-message.decorator';
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
  @MessageRoute('*.*.rpc')
  recivedTopic(obj: any, consumeMessage: ConsumeMessage) {
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
  @MessageRoute('global.rpc')
  recivedGlobal(obj: any, consumeMessage: ConsumeMessage) {
    this.rmqServie.ack(consumeMessage);
    return { message: obj };
  }

  @MessageNonRoute()
  recivedNonRoute(obj: any, consumeMessage: ConsumeMessage) {
    this.rmqServie.ack(consumeMessage);
    return { message: obj };
  }
}
