import {
  Inject,
  Injectable,
  LoggerService,
  OnModuleDestroy,
  OnModuleInit,
} from '@nestjs/common';
import {
  IRMQExtendedOptions,
  INotifyReply,
  IPublishOptions,
  IResult,
  IRmqMiddleware,
  ISerDes,
  ReverseFunction,
  TypeChannel,
  TypeQueue,
  TypeRmqInterceptor,
  TypeRmqMiddleware,
  IRMQOptions,
  IModuleBroker,
} from './interfaces';
import {
  CallbackFunctionVariadic,
  IConsumeFunction,
  IMetaTegsMap,
  MetaTegEnpoint,
} from './interfaces/metategs';
import {
  DEFAULT_TIMEOUT,
  INDICATE_REPLY_QUEUE,
  INITIALIZATION_STEP_DELAY,
  INTERCEPTORS,
  MIDDLEWARES,
  MODULE_TOKEN,
  NACKED,
  NON_ROUTE,
  RMQ_BROKER_OPTIONS,
  RMQ_MESSAGE_META_TEG,
  SERDES,
  TIMEOUT_ERROR,
  NON_DECLARED_ROUTE,
  RMQ_OPTIONS,
} from './constants';
import { ConsumeMessage, Message, Replies, Channel, Options } from 'amqplib';
import {
  MetaTegsScannerService,
  RMQError,
  RmqErrorService,
  toRegex,
} from './common';
import { RmqNestjsConnectService } from './rmq-connect.service';
import { getUniqId } from './common/get-uniqId';
import { EventEmitter } from 'stream';
import { RQMColorLogger } from './common/logger';
import { ModuleRef } from '@nestjs/core';

@Injectable()
export class RmqService implements OnModuleInit, OnModuleDestroy {
  private sendResponseEmitter: EventEmitter = new EventEmitter();
  private extendedOptions: IRMQExtendedOptions = null;
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
    private readonly rmqErrorService: RmqErrorService,
    @Inject(RMQ_OPTIONS)
    private readonly rmQoptions: IRMQOptions,
    @Inject(RMQ_BROKER_OPTIONS) private readonly options: IModuleBroker,
    @Inject(SERDES) private readonly serDes: ISerDes,
    @Inject(INTERCEPTORS) private readonly interceptors: TypeRmqInterceptor[],
    @Inject(MIDDLEWARES) private readonly middlewares: TypeRmqMiddleware[],
    @Inject(MODULE_TOKEN) private readonly moduleToken: string,
  ) {
    this.extendedOptions = rmQoptions.extendedOptions ?? {};
    this.logger = rmQoptions.extendedOptions?.appOptions?.logger
      ? rmQoptions.extendedOptions.appOptions?.logger
      : new RQMColorLogger(this.extendedOptions.appOptions?.logMessages);
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
    if (!this.replyToQueue) throw Error(INDICATE_REPLY_QUEUE);

    await this.initializationCheck();
    const correlationId = getUniqId();
    const timeout =
      options?.timeout ?? this.options.messageTimeout ?? DEFAULT_TIMEOUT;

    return new Promise<IReply>(async (resolve, reject) => {
      const timerId = setTimeout(() => {
        reject(new RMQError(TIMEOUT_ERROR));
      }, timeout);
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
    });
  }
  public async notify<IMessage>(
    topic: string,
    message: IMessage,
    options?: Options.Publish,
  ): Promise<INotifyReply> {
    await this.initializationCheck();

    return new Promise<INotifyReply>(async (resolve, reject) => {
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

      if (this.extendedOptions?.typeChannel !== TypeChannel.CONFIRM_CHANNEL)
        resolve({ status: 'ok' });
    });
  }

  private async listenQueue(message: ConsumeMessage | null): Promise<void> {
    try {
      const route = this.getRouteByTopic(message.fields.routingKey);
      const consumer = this.getConsumer(route);
      const messageParse = this.deserializeMessage(message.content, consumer);
      const result = await this.handle(message, messageParse, consumer);
      if (message.properties.replyTo)
        await this.sendReply(
          message.properties.replyTo,
          consumer,
          result,
          message.properties.correlationId,
        );
    } catch (error) {
      this.logger.error('Error processing message', { error, message });
      this.rmqNestjsConnectService.nack(message, false, false);
    }
  }
  private async handle(
    message: ConsumeMessage,
    messageParse: any,
    consumer?: MetaTegEnpoint,
  ): Promise<IResult> {
    if (!consumer) {
      return {
        content: {},
        headers: this.rmqErrorService.buildError(
          new RMQError(NON_ROUTE, this.options.serviceName),
        ),
      };
    }
    const middlewareResut = await this.executeMiddlewares(
      consumer,
      message,
      messageParse,
    );
    const interceptorsReversed = await this.interceptorsReverse(
      consumer,
      message,
      messageParse,
    );
    if (middlewareResut.content != null) return middlewareResut;
    if (consumer.handler) {
      const result = await this.handleMessage(
        consumer.handler,
        messageParse,
        message,
      );
      await this.reverseInterceptors(
        interceptorsReversed,
        result.content,
        message,
      );
      return result;
    }
  }
  private async reverseInterceptors(
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
  ): Promise<IResult> {
    const middlewares = this.getMiddlewares(consumer);
    const result = { content: null, headers: {} };
    try {
      for (const middleware of middlewares) {
        const middlewareResut = await middleware.use(message, messageParse);
        if (middlewareResut != undefined) {
          result.content = middlewareResut;
        }
      }
    } catch (error) {
      result.headers = this.rmqErrorService.buildError(error);
    }
    return result;
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

  private deserializeMessage(content: Buffer, consumer?: MetaTegEnpoint) {
    return consumer?.serdes?.deserialize
      ? consumer.serdes.deserialize(content)
      : this.serDes.deserialize(content);
  }

  private getMiddlewares(consumer: MetaTegEnpoint): IRmqMiddleware[] {
    return this.middlewares
      .concat(consumer.middlewares)
      .map((middleware: any) => new middleware());
  }
  private async handleMessage(
    handler: IConsumeFunction,
    messageParse: string,
    message: ConsumeMessage,
  ): Promise<IResult> {
    const result = { content: {}, headers: {} };
    try {
      result.content = (await handler(messageParse, message)) || {};
    } catch (error) {
      result.headers = this.rmqErrorService.buildError(error);
    }
    return result;
  }

  private async sendReply(
    replyTo: string,
    consumer: MetaTegEnpoint,
    result: IResult,
    correlationId: string,
  ) {
    const serializedResult =
      consumer.serdes?.serialize(result.content) ||
      this.serDes.serialize(result.content);
    await this.rmqNestjsConnectService.sendToReplyQueue({
      replyTo,
      content: serializedResult,
      headers: result.headers,
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
    const { queue: queueName, consumeOptions } = this.options.queue;
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
      consumeOptions,
    );
  }

  private async assertReplyQueue() {
    const { queue, options, consumeOptions } = this.options.replyTo;
    this.replyToQueue = await this.rmqNestjsConnectService.assertQueue(
      TypeQueue.REPLY_QUEUE,
      { queue, options },
    );
    await this.rmqNestjsConnectService.listenReplyQueue(
      this.replyToQueue.queue,
      this.listenReplyQueue.bind(this),
      consumeOptions,
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
