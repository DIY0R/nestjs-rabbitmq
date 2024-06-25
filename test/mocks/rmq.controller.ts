import { Injectable } from '@nestjs/common';
import { RmqService } from '../../lib';

@Injectable()
export class RmqServieController {
  constructor(private readonly rmqServie: RmqService) {}

  async sendHi(obj: any) {
    const sendhi = await this.rmqServie.send<object, { message: object }>(
      'text.text',
      obj,
    );
    return sendhi;
  }
}
