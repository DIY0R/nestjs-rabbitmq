import {
  Inject,
  Injectable,
  LoggerService,
  OnModuleDestroy,
  OnModuleInit,
} from '@nestjs/common';
import { IMessageBroker, IPublishOptions, TypeQueue } from './interfaces';
import { IMetaTegsMap } from './interfaces/metategs';
import {
  DEFAULT_TIMEOUT,
  ERROR_NO_ROUTE,
  INDICATE_ERROR,
  INITIALIZATION_STEP_DELAY,
  INOF_NOT_FULL_OPTIONS,
  MODULE_TOKEN,
  RECIVED_MESSAGE_ERROR,
  RMQ_APP_OPTIONS,
  RMQ_BROKER_OPTIONS,
  RMQ_MESSAGE_META_TEG,
  TIMEOUT_ERROR,
} from './constants';
import { ConsumeMessage, Message, Replies } from 'amqplib';
import { MetaTegsScannerService } from './common';
import { RmqNestjsConnectService } from './rmq-connect.service';
import { getUniqId } from './common/get-uniqId';
import { EventEmitter } from 'stream';
import { IAppOptions } from './interfaces/app-options.interface';
import { RQMColorLogger } from './common/logger';

@Injectable()
export class RmqService implements OnModuleInit, OnModuleDestroy {
  private sendResponseEmitter: EventEmitter = new EventEmitter();

  private rmqMessageTegs: IMetaTegsMap = null;
  private replyToQueue: Replies.AssertQueue = null;
  private exchange: Replies.AssertExchange = null;
  private isInitialized: boolean = false;
  private connected = false;
  private logger: LoggerService;
  constructor(
    private readonly rmqNestjsConnectService: RmqNestjsConnectService,
    private readonly metaTegsScannerService: MetaTegsScannerService,
    @Inject(RMQ_BROKER_OPTIONS) private options: IMessageBroker,
    @Inject(RMQ_APP_OPTIONS) private appOptions: IAppOptions,
    @Inject(MODULE_TOKEN) private readonly moduleToken: string,
  ) {
    this.logger = appOptions.logger
      ? appOptions.logger
      : new RQMColorLogger(this.appOptions.logMessages);
  }

  async onModuleInit() {
    this.rmqMessageTegs = this.metaTegsScannerService.scan(
      RMQ_MESSAGE_META_TEG,
      this.moduleToken,
    );
    await this.init();
    this.isInitialized = true;
  }
  public healthCheck() {
    return this.rmqNestjsConnectService.isConnected;
  }
  public async notify<IMessage>(
    topic: string,
    message: IMessage,
    options?: IPublishOptions,
  ) {
    await this.initializationCheck();
    this.rmqNestjsConnectService.publish({
      exchange: this.options.exchange.exchange,
      routingKey: topic,
      content: message,
      options: {
        appId: this.options.serviceName,
        timestamp: new Date().getTime(),
        ...options,
      },
    });
    return { sent: 'ok' };
  }
  public async send<IMessage, IReply>(
    topic: string,
    message: IMessage,
    options?: IPublishOptions,
  ): Promise<IReply> {
    await this.initializationCheck();
    if (!this.replyToQueue) return this.logger.error(INDICATE_ERROR);
    return new Promise<IReply>(async (resolve, reject) => {
      const correlationId = getUniqId();
      const timeout =
        options?.timeout ?? this.options.messageTimeout ?? DEFAULT_TIMEOUT;
      const timerId = setTimeout(() => reject(TIMEOUT_ERROR), timeout);
      this.sendResponseEmitter.once(correlationId, (msg: Message) => {
        clearTimeout(timerId);
        if (msg.properties?.headers?.['-x-error'])
          reject(RECIVED_MESSAGE_ERROR);
        const { content } = msg;
        if (content.toString()) resolve(JSON.parse(content.toString()));
      });

      this.rmqNestjsConnectService.publish({
        exchange: this.options.exchange.exchange,
        routingKey: topic,
        content: message,
        options: {
          replyTo: this.replyToQueue.queue,
          appId: this.options.serviceName,
          correlationId,
          timestamp: new Date().getTime(),
          ...options,
        },
      });
    });
  }
  private async listenQueue(message: ConsumeMessage | null): Promise<void> {
    const consumeFunction = this.rmqMessageTegs.get(message.fields.routingKey);
    let result = { error: ERROR_NO_ROUTE };
    if (consumeFunction)
      result = await consumeFunction(JSON.parse(message.content.toString()));
    if (message.properties.replyTo) {
      await this.rmqNestjsConnectService.sendToReplyQueue({
        replyTo: message.properties.replyTo,
        content: result || { status: 'recived' },
        correlationId: message.properties.correlationId,
      });
    }
    this.rmqNestjsConnectService.ack(message);
  }
  private async listenReplyQueue(
    message: ConsumeMessage | null,
  ): Promise<void> {
    if (message.properties.correlationId) {
      this.sendResponseEmitter.emit(message.properties.correlationId, message);
    }
  }

  private async init() {
    this.exchange = await this.rmqNestjsConnectService.assertExchange(
      this.options.exchange,
    );
    if (this.options.replyTo) await this.assertReplyQueueBind();
    await this.bindQueueExchange();
  }
  private async bindQueueExchange() {
    if (!this.options.queue || !this.rmqMessageTegs?.size)
      return this.logger.warn(
        INOF_NOT_FULL_OPTIONS,
        this.options.exchange.exchange,
      );
    const queue = await this.rmqNestjsConnectService.assertQueue(
      TypeQueue.QUEUE,
      this.options.queue,
    );
    this.rmqMessageTegs.forEach(async (_, key) => {
      await this.rmqNestjsConnectService.bindQueue({
        queue: queue.queue,
        source: this.exchange.exchange,
        pattern: key.toString(),
      });
    });
    await this.rmqNestjsConnectService.listenQueue(
      this.options.queue.queue,
      this.listenQueue.bind(this),
    );
  }

  private async assertReplyQueueBind() {
    this.replyToQueue = await this.rmqNestjsConnectService.assertQueue(
      TypeQueue.REPLY_QUEUE,
      { queue: '', options: this.options.replyTo },
    );
    await this.rmqNestjsConnectService.listenReplyQueue(
      this.replyToQueue.queue,
      this.listenReplyQueue.bind(this),
    );
  }
  private async initializationCheck() {
    if (this.isInitialized) return;
    await new Promise<void>((resolve) =>
      setTimeout(resolve, INITIALIZATION_STEP_DELAY),
    );
    await this.initializationCheck();
  }

  async onModuleDestroy() {
    this.sendResponseEmitter.removeAllListeners();
  }
}
