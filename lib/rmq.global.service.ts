import {
  ConsumeMessage,
  Message,
  Replies,
  Channel,
  Options,
  ConfirmChannel,
} from 'amqplib';
import { Inject, LoggerService, OnModuleInit } from '@nestjs/common';
import { EventEmitter } from 'stream';
import {
  IGlobalOptions,
  INotifyReply,
  IPublishOptions,
  ISerDes,
  TypeChannel,
  TypeQueue,
} from './interfaces';
import { RmqNestjsConnectService } from './rmq-connect.service';
import {
  DEFAULT_TIMEOUT,
  INDICATE_REPLY_QUEUE_GLOBAL,
  INITIALIZATION_STEP_DELAY,
  NACKED,
  RMQ_APP_OPTIONS,
  SERDES,
  TIMEOUT_ERROR,
} from './constants';

import { getUniqId, RMQError, RmqErrorService, RQMColorLogger } from './common';

export class RmqGlobalService implements OnModuleInit {
  private replyToQueue: Replies.AssertQueue = null;
  private sendResponseEmitter: EventEmitter = new EventEmitter();
  private logger: LoggerService;
  private isInitialized = false;

  constructor(
    private readonly rmqNestjsConnectService: RmqNestjsConnectService,
    private readonly rmqErrorService: RmqErrorService,

    @Inject(RMQ_APP_OPTIONS) private globalOptions: IGlobalOptions,
    @Inject(SERDES) private readonly serDes: ISerDes,
  ) {
    this.logger = globalOptions.appOptions?.logger
      ? globalOptions.appOptions.logger
      : new RQMColorLogger(this.globalOptions.appOptions?.logMessages);
  }
  async onModuleInit() {
    if (this.globalOptions?.globalBroker?.replyTo) await this.replyQueue();
    this.isInitialized = true;
  }
  get channel(): Promise<Channel | ConfirmChannel> {
    return this.rmqNestjsConnectService.getBaseChannel();
  }
  public async send<IMessage, IReply>(
    exchange: string,
    topic: string,
    message: IMessage,
    options?: IPublishOptions,
  ): Promise<IReply> {
    try {
      if (!this.replyToQueue) throw Error(INDICATE_REPLY_QUEUE_GLOBAL);
      await this.initializationCheck();
      const { messageTimeout, serviceName } = this.globalOptions.globalBroker;
      return new Promise<IReply>(async (resolve, reject) => {
        const correlationId = getUniqId();
        const timeout = options?.timeout ?? messageTimeout ?? DEFAULT_TIMEOUT;
        const timerId = setTimeout(() => reject(TIMEOUT_ERROR), timeout);
        this.sendResponseEmitter.once(correlationId, (msg: Message) => {
          clearTimeout(timerId);
          if (msg.properties?.headers?.['-x-error'])
            return reject(this.rmqErrorService.errorHandler(msg));

          const content = msg.content;
          if (content.toString()) resolve(this.serDes.deserialize(content));
        });
        const confirmationFunction = (err: any, ok: Replies.Empty) => {
          if (err) {
            clearTimeout(timerId);
            reject(new RMQError(NACKED));
          }
        };

        await this.rmqNestjsConnectService.publish(
          {
            exchange: exchange,
            routingKey: topic,
            content: this.serDes.serialize(message),
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
    } catch (error) {
      this.logger.error(error);
    }
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
          content: this.serDes.serialize(message),
          options: {
            appId: this.globalOptions?.globalBroker?.serviceName ?? '',
            timestamp: new Date().getTime(),
            ...options,
          },
        },
        confirmationFunction,
      );
      if (this.globalOptions?.typeChannel !== TypeChannel.CONFIRM_CHANNEL)
        resolve({ status: 'ok' });
    });
  }

  public async sendToQueue<IMessage>(
    queue: string,
    content: IMessage,
    options?: Options.Publish,
  ): Promise<boolean> {
    const status = await this.rmqNestjsConnectService.sendToQueue(
      queue,
      this.serDes.serialize(content),
      options,
    );
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
  private async initializationCheck() {
    if (this.isInitialized) return;
    await new Promise<void>((resolve) =>
      setTimeout(resolve, INITIALIZATION_STEP_DELAY),
    );
    await this.initializationCheck();
  }
}
