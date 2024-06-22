import { Injectable } from '@nestjs/common';
import { RmqService } from '../../lib';

@Injectable()
export class RmqServieController {
  constructor(private readonly rmqServie: RmqService) {}

  async sendHi() {
    const sendhi = await this.rmqServie.send<object, { message: 'hi' }>(
      'hi',
      {},
    );
    return sendhi;
  }
}
