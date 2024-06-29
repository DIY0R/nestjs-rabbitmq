import { ConsumeMessage, Message, Replies } from 'amqplib';
import { IGlobalOptions, IPublishOptions, TypeQueue } from './interfaces';
import { RmqNestjsConnectService } from './rmq-connect.service';
import { DEFAULT_TIMEOUT, RMQ_APP_OPTIONS, TIMEOUT_ERROR } from './constants';
import { Inject } from '@nestjs/common';
import { getUniqId } from './common';
import { EventEmitter } from 'stream';

export class RmqGlobalService {
  private replyToQueue: Replies.AssertQueue = null;
  private sendResponseEmitter: EventEmitter = new EventEmitter();
  constructor(
    private readonly rmqNestjsConnectService: RmqNestjsConnectService,
    @Inject(RMQ_APP_OPTIONS) private globalOptions: IGlobalOptions,
  ) {}
  public async send<IMessage, IReply>(
    exchange: string,
    topic: string,
    message: IMessage,
    options?: IPublishOptions,
  ): Promise<IReply> {
    if (!this.replyToQueue) await this.replyQueue();
    const { messageTimeout, serviceName } = this.globalOptions.globalBroker;
    return new Promise<IReply>(async (resolve, reject) => {
      const correlationId = getUniqId();
      const timeout = options?.timeout ?? messageTimeout ?? DEFAULT_TIMEOUT;
      const timerId = setTimeout(() => reject(TIMEOUT_ERROR), timeout);
      this.sendResponseEmitter.once(correlationId, (msg: Message) => {
        clearTimeout(timerId);
        const { content } = msg;
        if (content.toString()) resolve(JSON.parse(content.toString()));
      });

      this.rmqNestjsConnectService.publish({
        exchange: exchange,
        routingKey: topic,
        content: message,
        options: {
          replyTo: this.replyToQueue.queue,
          appId: serviceName,
          correlationId,
          timestamp: new Date().getTime(),
          ...options,
        },
      });
    });
  }
  private async listenReplyQueue(
    message: ConsumeMessage | null,
  ): Promise<void> {
    if (message.properties.correlationId) {
      this.sendResponseEmitter.emit(message.properties.correlationId, message);
    }
  }
  private async replyQueue() {
    this.replyToQueue = await this.rmqNestjsConnectService.assertQueue(
      TypeQueue.REPLY_QUEUE,
      this.globalOptions.globalBroker?.replyTo,
    );
    await this.rmqNestjsConnectService.listenReplyQueue(
      this.replyToQueue.queue,
      this.listenReplyQueue.bind(this),
    );
  }
}
