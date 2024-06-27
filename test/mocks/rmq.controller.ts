import { Injectable } from '@nestjs/common';
import { RmqService } from '../../lib';

@Injectable()
export class RmqServieController {
  constructor(private readonly rmqServie: RmqService) {}

  async sendMessage(obj: any) {
    const sendhi = await this.rmqServie.send<object, { message: object }>(
      'text.text',
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
