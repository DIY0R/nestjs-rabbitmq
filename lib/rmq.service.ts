import {
  Inject,
  Injectable,
  LoggerService,
  OnModuleDestroy,
  OnModuleInit,
} from '@nestjs/common';
import {
  IGlobalOptions,
  IMessageBroker,
  INotifyReply,
  IPublishOptions,
  IRmqMiddleware,
  ISerDes,
  ReverseFunction,
  TypeChannel,
  TypeQueue,
  TypeRmqInterceptor,
  TypeRmqMiddleware,
} from './interfaces';
import {
  CallbackFunctionVariadic,
  IConsumFunction,
  IMetaTegsMap,
  MetaTegEnpoint,
} from './interfaces/metategs';
import {
  DEFAULT_TIMEOUT,
  EMPTY_MESSAGE,
  ERROR_NO_ROUTE,
  INDICATE_REPLY_QUEUE,
  INITIALIZATION_STEP_DELAY,
  INTERCEPTORS,
  MIDDLEWARES,
  MODULE_TOKEN,
  NACKED,
  NON_ROUTE,
  RECEIVED_MESSAGE_ERROR,
  RETURN_NOTHING,
  RMQ_APP_OPTIONS,
  RMQ_BROKER_OPTIONS,
  RMQ_MESSAGE_META_TEG,
  SERDES,
  TIMEOUT_ERROR,
  NON_DECLARED_ROUTE,
} from './constants';
import { ConsumeMessage, Message, Replies, Channel, Options } from 'amqplib';
import { MetaTegsScannerService, toRegex } from './common';
import { RmqNestjsConnectService } from './rmq-connect.service';
import { getUniqId } from './common/get-uniqId';
import { EventEmitter } from 'stream';
import { RQMColorLogger } from './common/logger';
import { ModuleRef } from '@nestjs/core';

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
    private readonly moduleRef: ModuleRef,
    private readonly rmqNestjsConnectService: RmqNestjsConnectService,
    private readonly metaTegsScannerService: MetaTegsScannerService,

    @Inject(RMQ_BROKER_OPTIONS) private readonly options: IMessageBroker,
    @Inject(RMQ_APP_OPTIONS) private readonly globalOptions: IGlobalOptions,
    @Inject(SERDES) private readonly serDes: ISerDes,
    @Inject(INTERCEPTORS) private readonly interceptors: TypeRmqInterceptor[],
    @Inject(MIDDLEWARES) private readonly middlewares: TypeRmqMiddleware[],
    @Inject(MODULE_TOKEN) private readonly moduleToken: string,
  ) {
    this.logger = globalOptions.appOptions?.logger
      ? globalOptions.appOptions?.logger
      : new RQMColorLogger(this.globalOptions.appOptions?.logMessages);
  }

  async onModuleInit() {
    await this.init();
    this.isInitialized = true;
  }
  public healthCheck() {
    return this.rmqNestjsConnectService.isConnected;
  }

  private async init() {
    this.exchange = await this.rmqNestjsConnectService.assertExchange(
      this.options.exchange,
    );
    if (this.options?.replyTo) await this.assertReplyQueue();
    if (this.options?.queue) {
      this.scanMetaTegs();
      await this.bindQueueExchange();
    }
  }
  public async send<IMessage, IReply>(
    topic: string,
    message: IMessage,
    options?: IPublishOptions,
  ): Promise<IReply> {
    await this.initializationCheck();
    const correlationId = getUniqId();
    const timeout =
      options?.timeout ?? this.options.messageTimeout ?? DEFAULT_TIMEOUT;
    const timerId = setTimeout(() => {
      this.logger.error(`Message timed out after ${timeout}ms`, {
        correlationId,
      });
      throw new Error(TIMEOUT_ERROR);
    }, timeout);

    return new Promise<IReply>(async (resolve, reject) => {
      try {
        if (!this.replyToQueue) throw Error(INDICATE_REPLY_QUEUE);
        this.sendResponseEmitter.once(correlationId, (msg: Message) => {
          clearTimeout(timerId);
          if (msg.properties?.headers?.['-x-error']) {
            this.logger.error('Received message with error header', {
              correlationId,
            });
            return reject(new Error(RECEIVED_MESSAGE_ERROR));
          }
          const content = msg.content;
          if (content.toString()) {
            resolve(this.serDes.deserialize(content));
          } else {
            this.logger.error(EMPTY_MESSAGE, {
              correlationId,
            });
            reject(new Error(EMPTY_MESSAGE));
          }
        });
        const confirmationFunction = (err: any, ok: Replies.Empty) => {
          if (err) {
            clearTimeout(timerId);
            reject(NACKED);
          }
        };
        await this.rmqNestjsConnectService.publish(
          {
            exchange: this.options.exchange.exchange,
            routingKey: topic,
            content: this.serDes.serialize(message),
            options: {
              replyTo: this.replyToQueue.queue,
              appId: this.options.serviceName,
              correlationId,
              timestamp: new Date().getTime(),
              ...options,
            },
          },
          confirmationFunction,
        );
      } catch (error) {
        clearTimeout(timerId);
        this.logger.error('Error publishing message', { correlationId, error });
        reject(error);
      }
    });
  }
  public async notify<IMessage>(
    topic: string,
    message: IMessage,
    options?: Options.Publish,
  ): Promise<INotifyReply> {
    await this.initializationCheck();

    return new Promise<INotifyReply>(async (resolve, reject) => {
      try {
        const confirmationFunction = (err: any, ok: Replies.Empty) => {
          if (err !== null) {
            this.logger.error(`Publish failed: ${err.message}`);
            return reject(NACKED);
          }
          resolve({ status: 'ok' });
        };

        await this.rmqNestjsConnectService.publish(
          {
            exchange: this.options.exchange.exchange,
            routingKey: topic,
            content: this.serDes.serialize(message),
            options: {
              appId: this.options.serviceName,
              timestamp: new Date().getTime(),
              ...options,
            },
          },
          confirmationFunction,
        );

        if (this.globalOptions?.typeChannel !== TypeChannel.CONFIRM_CHANNEL)
          resolve({ status: 'ok' });
      } catch (err) {
        this.logger.error(`Notify error: ${err.message}`);
        reject(err);
      }
    });
  }

  private async listenQueue(message: ConsumeMessage | null): Promise<void> {
    try {
      if (!message) throw new Error('Received null message');
      const route = this.getRouteByTopic(message.fields.routingKey);
      const consumer = this.getConsumer(route);
      const messageParse = this.deserializeMessage(consumer, message.content);
      const middlewareResut = await this.executeMiddlewares(
        consumer,
        message,
        messageParse,
      );

      let result = { error: ERROR_NO_ROUTE };
      if (consumer.handler) {
        const interceptorsReversed = await this.interceptorsReverse(
          consumer,
          message,
          messageParse,
        );
        result = await this.handleMessage(
          consumer.handler,
          messageParse,
          message,
        );
        await this.callReverseFunctions(interceptorsReversed, result, message);
      }

      if (message.properties.replyTo)
        await this.sendReply(
          message.properties.replyTo,
          consumer,
          middlewareResut ?? result,
          message.properties.correlationId,
        );
    } catch (error) {
      this.logger.error('Error processing message', { error, message });
      this.rmqNestjsConnectService.nack(message, false, false);
    }
  }
  private async callReverseFunctions(
    interceptorsReversed: ReverseFunction[],
    result: any,
    message: ConsumeMessage,
  ) {
    for (const revers of interceptorsReversed.reverse())
      await revers(result, message);
  }
  private async executeMiddlewares(
    consumer: MetaTegEnpoint,
    message: ConsumeMessage,
    messageParse: any,
  ): Promise<any> {
    const middlewares = this.getMiddlewares(consumer);
    for (const middleware of middlewares) {
      const middlewareResut = await middleware.use(message, messageParse);
      if (middlewareResut != undefined) {
        consumer.handler = null;
        return middlewareResut;
      }
    }
  }
  private async interceptorsReverse(
    consumer: MetaTegEnpoint,
    message: ConsumeMessage,
    messageParse: any,
  ): Promise<ReverseFunction[]> {
    const interceptors: any = this.getInterceptors(consumer.interceptors);
    const interceptorsReversed: ReverseFunction[] = [];
    for (const intercept of interceptors) {
      const fnReversed = await intercept(message, messageParse);
      interceptorsReversed.push(fnReversed);
    }
    return interceptorsReversed;
  }
  private getInterceptors(consumerInterceptors: CallbackFunctionVariadic[]) {
    const moduleInterceptors = this.interceptors.map((token) => {
      const instance = this.moduleRef.get(token);
      return instance.intercept.bind(instance);
    });
    return moduleInterceptors.concat(consumerInterceptors);
  }

  private getConsumer(route: string): MetaTegEnpoint {
    return this.rmqMessageTegs.get(route) || this.rmqMessageTegs.get(NON_ROUTE);
  }

  private deserializeMessage(consumer: MetaTegEnpoint, content: Buffer) {
    return consumer.serdes?.deserialize
      ? consumer.serdes.deserialize(content)
      : this.serDes.deserialize(content);
  }

  private getMiddlewares(consumer: MetaTegEnpoint): IRmqMiddleware[] {
    return this.middlewares
      .concat(consumer.middlewares)
      .map((middleware: any) => new middleware());
  }
  private async handleMessage(
    handler: IConsumFunction,
    messageParse: string,
    message: ConsumeMessage,
  ) {
    const result = await handler(messageParse, message);
    return result || { info: RETURN_NOTHING };
  }

  private async sendReply(
    replyTo: string,
    consumer: MetaTegEnpoint,
    result: any,
    correlationId: string,
  ) {
    const serializedResult =
      consumer.serdes?.serialize(result) || this.serDes.serialize(result);
    await this.rmqNestjsConnectService.sendToReplyQueue({
      replyTo,
      content: serializedResult,
      correlationId,
    });
  }

  private async listenReplyQueue(
    message: ConsumeMessage | null,
  ): Promise<void> {
    if (message.properties.correlationId)
      this.sendResponseEmitter.emit(message.properties.correlationId, message);
  }

  private async bindQueueExchange() {
    const { queue: queueName, consumOptions } = this.options.queue;
    if (!this.rmqMessageTegs?.size) return this.logger.warn(NON_DECLARED_ROUTE);
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
      queueName,
      this.listenQueue.bind(this),
      consumOptions,
    );
  }

  private async assertReplyQueue() {
    const { queue, options, consumOptions } = this.options.replyTo;
    this.replyToQueue = await this.rmqNestjsConnectService.assertQueue(
      TypeQueue.REPLY_QUEUE,
      { queue, options },
    );
    await this.rmqNestjsConnectService.listenReplyQueue(
      this.replyToQueue.queue,
      this.listenReplyQueue.bind(this),
      consumOptions,
    );
  }
  public ack(
    ...params: Parameters<Channel['ack']>
  ): ReturnType<Channel['ack']> {
    return this.rmqNestjsConnectService.ack(...params);
  }
  public nack(
    ...params: Parameters<Channel['nack']>
  ): ReturnType<Channel['nack']> {
    return this.rmqNestjsConnectService.nack(...params);
  }
  private async initializationCheck() {
    if (this.isInitialized) return;
    await new Promise<void>((resolve) =>
      setTimeout(resolve, INITIALIZATION_STEP_DELAY),
    );
    await this.initializationCheck();
  }
  private getRouteByTopic(topic: string): string {
    for (const route of this.rmqMessageTegs.keys()) {
      const regex = toRegex(route);
      const isMatch = regex.test(topic);
      if (isMatch) return route;
    }
    return '';
  }
  private scanMetaTegs() {
    this.rmqMessageTegs = this.metaTegsScannerService.scan(
      RMQ_MESSAGE_META_TEG,
      this.moduleToken,
    );
  }

  async onModuleDestroy() {
    this.sendResponseEmitter.removeAllListeners();
  }
}
