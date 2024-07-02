import { Injectable } from '@nestjs/common';
import { MessageRoute, RmqService, RmqGlobalService } from '../../lib';

@Injectable()
export class RmqServieController {
  constructor(
    private readonly rmqServie: RmqService,
    private readonly rmqGlobalService: RmqGlobalService,
  ) {}

  async sendMessage(obj: Record<string, any>, topic: string = 'text.text') {
    const sendhi = await this.rmqServie.send<object, { message: object }>(
      topic,
      obj,
    );
    return sendhi;
  }

  async sendNonRoute(obj: Record<string, any>) {
    const message = await this.rmqServie.send<object, { message: object }>(
      'text.text.text',
      obj,
    );
    return message;
  }
  async sendGlobalRoute(obj: Record<string, any>) {
    const message = await this.rmqGlobalService.send<
      object,
      { message: object }
    >('for-test', 'global.rpc', obj);

    return message;
  }

  sendNotify(obj: Record<string, any>) {
    const message = this.rmqGlobalService.notify<object>(
      'for-test',
      'notify.global',
      obj,
    );
    return message;
  }

  sendToQueue(queue: string, obj: Record<string, any>) {
    const status = this.rmqGlobalService.sendToQueue<object>(queue, obj);
    return status;
  }
}
