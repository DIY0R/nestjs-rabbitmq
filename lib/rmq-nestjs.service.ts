import {
  Inject,
  Injectable,
  OnModuleDestroy,
  OnModuleInit,
} from '@nestjs/common';
import { RmqNestjsConnectService } from './rmq-nestjs-connect.service';

import { IMessageBroker, TypeQueue } from './interfaces';
import { MetaTegsMap } from './interfaces/metategs';
import { RMQ_BROKER_OPTIONS, RMQ_MESSAGE_META_TEG } from './constants';
import { Replies } from 'amqplib';
import { MetaTegsScannerService } from './common';

@Injectable()
export class RmqService implements OnModuleInit, OnModuleDestroy {
  private rmqMessageTegs: MetaTegsMap;
  private replyToQueue: Replies.AssertQueue = null;
  private exchange: Replies.AssertExchange = null;
  constructor(
    private readonly rmqNestjsConnectService: RmqNestjsConnectService,

    private readonly metaTegsScannerService: MetaTegsScannerService,
    @Inject(RMQ_BROKER_OPTIONS) private options: IMessageBroker
  ) {}

  async onModuleInit() {
    this.rmqMessageTegs =
      this.metaTegsScannerService.scan(RMQ_MESSAGE_META_TEG);
    await this.bindQueueExchange();
  }
  private async bindQueueExchange() {
    try {
      this.exchange = await this.rmqNestjsConnectService.assertExchange(
        this.options.exchange
      );
      if (this.options.replyTo) await this.assertReplyQueue();
      if (!this.options.queue || !this.rmqMessageTegs?.size) return;
      const queue = await this.rmqNestjsConnectService.assertQueue(
        TypeQueue.REPLY_QUEUE,
        this.options.queue
      );
      this.rmqMessageTegs.forEach(async (_, key) => {
        await this.rmqNestjsConnectService.bindQueue({
          queue: queue.queue,
          source: this.exchange.exchange,
          pattern: key.toString(),
          // args:any - comming soon
        });
      });
    } catch (error) {
      throw new Error(`Failed to bind queue to exchange,${error.message}`);
    }
  }
  private async assertReplyQueue() {
    this.replyToQueue = await this.rmqNestjsConnectService.assertQueue(
      TypeQueue.REPLY_QUEUE,
      { queue: '', options: this.options.replyTo }
    );
  }
  async onModuleDestroy() {
    throw new Error('Method not implemented.');
  }
}
