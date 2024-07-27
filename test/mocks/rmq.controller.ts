import { Injectable } from '@nestjs/common';
import { RmqService, RmqGlobalService } from '../../lib';

@Injectable()
export class RmqServieController {
  constructor(
    private readonly rmqServie: RmqService,
    private readonly rmqGlobalService: RmqGlobalService,
  ) {}

  async sendMessage(obj: Record<string, any>, topic: string) {
    const sendhi = await this.rmqServie.send<object, { message: object }>(
      topic,
      obj,
    );
    return sendhi;
  }
  async sendMessageWithProvider<T>(
    obj: Record<string, any>,
    topic: string = 'text.interceptor',
  ) {
    const sendhi = await this.rmqServie.send<object, T>(topic, obj);
    return sendhi;
  }

  async sendGlobal(obj: Record<string, any>, topic: string) {
    const message = await this.rmqGlobalService.send<
      object,
      { message: object }
    >('for-test', topic, obj);

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
  sendNotifyService(obj: Record<string, any>) {
    const message = this.rmqServie.notify<object>('notify.global', obj);
    return message;
  }
  sendToQueue(queue: string, obj: Record<string, any>) {
    const status = this.rmqGlobalService.sendToQueue<object>(queue, obj);
    return status;
  }
}
