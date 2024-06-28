import { Injectable } from '@nestjs/common';
import { RmqService } from '../../lib';

@Injectable()
export class RmqServieController {
  constructor(private readonly rmqServie: RmqService) {}

  async sendMessage(obj: any, topic: string = 'text.text') {
    const sendhi = await this.rmqServie.send<object, { message: object }>(
      topic,
      obj,
    );
    return sendhi;
  }

  async sendNonRoute(obj: any) {
    const message = await this.rmqServie.send<object, { message: object }>(
      'text.text.text',
      obj,
    );
    return message;
  }
}
