import { Inject, LoggerService, OnModuleInit } from '@nestjs/common';
import { ConsumeMessage, Message, Replies, Channel, Options, ConfirmChannel } from 'amqplib';
import { EventEmitter } from 'stream';
import { RmqNestjsConnectService } from './rmq-connect.service';
import {
  IRMQExtendedOptions,
  INotifyReply,
  IPublishOptions,
  ISerDes,
  TypeChannel,
  TypeQueue,
  IRMQOptions,
} from './interfaces';

import {
  DEFAULT_TIMEOUT,
  INDICATE_REPLY_QUEUE_GLOBAL,
  INITIALIZATION_STEP_DELAY,
  NACKED,
  RMQ_OPTIONS,
  TIMEOUT_ERROR,
} from './constants';

import {
  getUniqId,
  RMQError,
  RmqErrorGlobalService,
  RQMColorLogger,
  defaultSerDes,
} from './common';

export class RmqGlobalService implements OnModuleInit {
  private replyToQueue: Replies.AssertQueue = null;
  private extendedOptions: IRMQExtendedOptions = null;
  private serDes: ISerDes = defaultSerDes;
  private sendResponseEmitter: EventEmitter = new EventEmitter();
  private logger: LoggerService;
  private isInitialized = false;

  constructor(
    @Inject(RMQ_OPTIONS) private readonly RMQOptions: IRMQOptions,
    private readonly rmqNestjsConnectService: RmqNestjsConnectService,
    private readonly rmqErrorGlobalService: RmqErrorGlobalService,
  ) {
    this.extendedOptions = RMQOptions.extendedOptions ?? {};
    this.serDes = this.extendedOptions?.globalBroker?.serDes ?? defaultSerDes;
    this.logger = RMQOptions.extendedOptions?.appOptions?.logger
      ? RMQOptions.extendedOptions.appOptions.logger
      : new RQMColorLogger(this.extendedOptions?.appOptions?.logMessages);
  }

  async onModuleInit() {
    if (this.extendedOptions?.globalBroker?.replyTo) await this.replyQueue();
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
      const { messageTimeout, serviceName } = this.extendedOptions.globalBroker;
      return new Promise<IReply>(async (resolve, reject) => {
        const correlationId = getUniqId();
        const timeout = options?.timeout ?? messageTimeout ?? DEFAULT_TIMEOUT;
        const timerId = setTimeout(() => reject(TIMEOUT_ERROR), timeout);
        this.sendResponseEmitter.once(correlationId, (msg: Message) => {
          clearTimeout(timerId);
          if (msg.properties?.headers?.['-x-error']) {
            return reject(this.rmqErrorGlobalService.errorHandler(msg));
          }
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
            appId: this.extendedOptions?.globalBroker?.serviceName ?? '',
            timestamp: new Date().getTime(),
            ...options,
          },
        },
        confirmationFunction,
      );
      if (this.extendedOptions?.typeChannel !== TypeChannel.CONFIRM_CHANNEL) {
        resolve({ status: 'ok' });
      }
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

  public ack(...params: Parameters<Channel['ack']>): ReturnType<Channel['ack']> {
    return this.rmqNestjsConnectService.ack(...params);
  }

  private async listenReplyQueue(message: ConsumeMessage | null): Promise<void> {
    if (message.properties.correlationId) {
      this.sendResponseEmitter.emit(message.properties.correlationId, message);
    }
  }

  private async replyQueue() {
    this.replyToQueue = await this.rmqNestjsConnectService.assertQueue(
      TypeQueue.REPLY_QUEUE,
      this.extendedOptions.globalBroker.replyTo,
    );
    await this.rmqNestjsConnectService.listenReplyQueue(
      this.replyToQueue.queue,
      this.listenReplyQueue.bind(this),
      this.extendedOptions.globalBroker.replyTo.consumeOptions,
    );
  }

  private async initializationCheck() {
    if (this.isInitialized) return;
    await new Promise<void>(resolve => setTimeout(resolve, INITIALIZATION_STEP_DELAY));
    await this.initializationCheck();
  }
}
