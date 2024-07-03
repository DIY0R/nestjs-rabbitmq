import {
  ConsumeMessage,
  Message,
  Replies,
  Channel,
  Options,
  ConfirmChannel,
} from 'amqplib';
import {
  IGlobalOptions,
  INotifyReply,
  IPublishOptions,
  TypeChanel,
  TypeQueue,
} from './interfaces';
import { RmqNestjsConnectService } from './rmq-connect.service';
import {
  DEFAULT_TIMEOUT,
  INDICATE_REPLY_QUEUE,
  NACKED,
  RMQ_APP_OPTIONS,
  TIMEOUT_ERROR,
} from './constants';
import { Inject, Logger, LoggerService, OnModuleInit } from '@nestjs/common';
import { getUniqId } from './common';
import { EventEmitter } from 'stream';
import { RQMColorLogger } from './common/logger';

export class RmqGlobalService implements OnModuleInit {
  private replyToQueue: Replies.AssertQueue = null;
  private sendResponseEmitter: EventEmitter = new EventEmitter();
  private logger: LoggerService;

  public channel: Channel | ConfirmChannel = null;

  constructor(
    private readonly rmqNestjsConnectService: RmqNestjsConnectService,
    @Inject(RMQ_APP_OPTIONS) private globalOptions: IGlobalOptions,
  ) {
    this.logger = globalOptions.appOptions?.logger
      ? globalOptions.appOptions.logger
      : new RQMColorLogger(this.globalOptions.appOptions?.logMessages);
  }
  async onModuleInit() {
    if (this.globalOptions?.globalBroker?.replyTo) await this.replyQueue();
    this.channel = await this.rmqNestjsConnectService.getBaseChanel();
  }
  public async send<IMessage, IReply>(
    exchange: string,
    topic: string,
    message: IMessage,
    options?: IPublishOptions,
  ): Promise<IReply> {
    if (!this.replyToQueue) return this.logger.error(INDICATE_REPLY_QUEUE);
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
      const confirmationFunction = (err: any, ok: Replies.Empty) => {
        if (err) {
          clearTimeout(timerId);
          reject(NACKED);
        }
      };

      this.rmqNestjsConnectService.publish(
        {
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
        },
        confirmationFunction,
      );
    });
  }

  public notify<IMessage>(
    exchange: string,
    topic: string,
    message: IMessage,
    options?: Options.Publish,
  ): Promise<INotifyReply> {
    return new Promise((resolve, reject) => {
      const confirmationFunction = (err: any, ok: Replies.Empty) => {
        if (err !== null) return reject(NACKED);
        resolve({ status: 'ok' });
      };
      this.rmqNestjsConnectService.publish(
        {
          exchange,
          routingKey: topic,
          content: message,
          options: {
            appId: this.globalOptions.globalBroker.serviceName,
            timestamp: new Date().getTime(),
            ...options,
          },
        },
        confirmationFunction,
      );
      if (this.globalOptions.typeChanel !== TypeChanel.CONFIR_CHANEL)
        resolve({ status: 'ok' });
    });
  }

  public sendToQueue<IMessage>(
    ...args: [string, IMessage, Options.Publish?]
  ): boolean {
    const status = this.rmqNestjsConnectService.sendToQueue(...args);
    return status;
  }

  public ack(
    ...params: Parameters<Channel['ack']>
  ): ReturnType<Channel['ack']> {
    return this.rmqNestjsConnectService.ack(...params);
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
      this.globalOptions.globalBroker.replyTo,
    );
    await this.rmqNestjsConnectService.listenReplyQueue(
      this.replyToQueue.queue,
      this.listenReplyQueue.bind(this),
      this.globalOptions.globalBroker.replyTo.consumOptions,
    );
  }
}
