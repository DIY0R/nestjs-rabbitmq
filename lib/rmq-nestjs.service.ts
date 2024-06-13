import {
  Inject,
  Injectable,
  OnModuleDestroy,
  OnModuleInit,
} from '@nestjs/common';
import { RmqNestjsConnectService } from './rmq-nestjs-connect.service';
import { RMQ_BROKER_OPTIONS } from './constants';
import { IMessageBroker, TypeQueue } from './interfaces';
import { Replies } from 'amqplib';

@Injectable()
export class RmqService implements OnModuleInit, OnModuleDestroy {
  private replyToQueue: Replies.AssertQueue = null;
  constructor(
    private readonly rmqNestjsConnectService: RmqNestjsConnectService,
    @Inject(RMQ_BROKER_OPTIONS) private options: IMessageBroker
  ) {}

  //  async bindT

  async onModuleInit() {
    await this.bindQueueExchange();
  }
  private async bindQueueExchange() {
    try {
      const exchange = await this.rmqNestjsConnectService.assertExchange(
        this.options.exchange
      );
      if (this.options.replyTo) await this.assertReplyQueue();
      if (!this.options.queue) return;
      const queue = await this.rmqNestjsConnectService.assertQueue(
        TypeQueue.REPLY_QUEUE,
        this.options.queue
      );

      await this.rmqNestjsConnectService.bindQueue({
        queue: queue.queue,
        source: exchange.exchange,
        pattern: 'rmq-Nestjs-Connect',
        args: { lopi: 12 },
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
