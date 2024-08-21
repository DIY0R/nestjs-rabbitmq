import {
  Inject,
  Injectable,
  LoggerService,
  OnModuleDestroy,
  OnModuleInit,
} from '@nestjs/common';
import {
  CLOSE_EVENT,
  CLOSE_MESSAGE,
  CONNECT_BLOCKED,
  CONNECT_BLOCKED_MESSAGE,
  CONNECT_ERROR,
  CONNECT_FAILED_MESSAGE,
  INITIALIZATION_STEP_DELAY,
  RECONNECTION_INTERVAL,
  RMQ_OPTIONS,
  ROOT_MODULE_DECLARED,
  SUCCESSFUL_CONNECT,
} from './constants';
import {
  Channel,
  ConfirmChannel,
  Connection,
  ConsumeMessage,
  Options,
  Replies,
  connect,
} from 'amqplib';
import {
  IRMQConnectConfig,
  IExchange,
  IQueue,
  TypeQueue,
  IBindQueue,
  ISendMessage,
  ISendToReplyQueueOptions,
  TypeChannel,
  IRMQOptions,
  IPrefetch,
} from './interfaces';

import { RQMColorLogger } from './common';

@Injectable()
export class RmqNestjsConnectService implements OnModuleInit, OnModuleDestroy {
  private connection: Connection = null;
  private baseChannel: Channel | ConfirmChannel = null;
  private replyToChannel: Channel = null;
  public isConnected = false;
  private logger: LoggerService;
  private isInitialized = false;
  constructor(
    @Inject(RMQ_OPTIONS)
    private readonly rmQoptions: IRMQOptions,
  ) {
    this.logger = rmQoptions.extendedOptions?.appOptions?.logger
      ? rmQoptions.extendedOptions.appOptions.logger
      : new RQMColorLogger(rmQoptions.extendedOptions?.appOptions?.logMessages);
  }
  async onModuleInit(): Promise<void> {
    if (this.isInitialized) throw Error(ROOT_MODULE_DECLARED);
    await this.setUpConnect(this.rmQoptions.connectOptions);
    await this.setUpChannels();

    this.isInitialized = true;
  }

  async assertExchange(options: IExchange): Promise<Replies.AssertExchange> {
    try {
      await this.initializationCheck();
      const exchange = await this.baseChannel.assertExchange(
        options.exchange,
        options.type,
        options.options,
      );
      return exchange;
    } catch (error) {
      throw new Error(
        `Failed to assert exchange '${options.exchange}': ${error.message}`,
      );
    }
  }
  ack(...params: Parameters<Channel['ack']>): ReturnType<Channel['ack']> {
    return this.baseChannel.ack(...params);
  }
  nack(...params: Parameters<Channel['nack']>): ReturnType<Channel['nack']> {
    return this.baseChannel.nack(...params);
  }
  async assertQueue(
    typeQueue: TypeQueue,
    options?: IQueue,
  ): Promise<Replies.AssertQueue> {
    await this.initializationCheck();
    try {
      if (typeQueue == TypeQueue.QUEUE)
        return await this.baseChannel.assertQueue(
          options.queue,
          options.options,
        );

      return await this.replyToChannel.assertQueue(
        options.queue,
        options.options,
      );
    } catch (error) {
      throw new Error(`Failed to assert ${typeQueue} queue: ${error}`);
    }
  }
  async getBaseChannel() {
    await this.initializationCheck();
    return this.baseChannel;
  }
  async bindQueue(bindQueue: IBindQueue): Promise<void> {
    await this.initializationCheck();
    try {
      await this.baseChannel.bindQueue(
        bindQueue.queue,
        bindQueue.source,
        bindQueue.pattern,
        bindQueue.args,
      );
    } catch (error) {
      throw new Error(
        `Failed to Bind Queue ,source:${bindQueue.source} queue: ${bindQueue.queue}`,
      );
    }
  }
  async sendToReplyQueue(sendToQueueOptions: ISendToReplyQueueOptions) {
    try {
      await this.initializationCheck();
      this.replyToChannel.sendToQueue(
        sendToQueueOptions.replyTo,
        sendToQueueOptions.content,
        {
          correlationId: sendToQueueOptions.correlationId,
          headers: sendToQueueOptions.headers,
        },
      );
    } catch (error) {
      throw new Error(`Failed to send Reply Queue`);
    }
  }
  async listenReplyQueue(
    queue: string,
    listenQueue: (msg: ConsumeMessage | null) => void,
    consumeOptions?: Options.Consume,
  ) {
    try {
      await this.replyToChannel.consume(
        queue,
        listenQueue,
        consumeOptions || {
          noAck: true,
        },
      );
    } catch (error) {
      throw new Error(`Failed to send listen Reply Queue`);
    }
  }
  async listenQueue(
    queue: string,
    listenQueue: (msg: ConsumeMessage | null) => void,
    consumeOptions?: Options.Consume,
  ): Promise<void> {
    try {
      await this.baseChannel.consume(
        queue,
        listenQueue,
        consumeOptions || {
          noAck: false,
        },
      );
    } catch (error) {
      throw new Error(`Failed to listen Queue`);
    }
  }

  async publish(
    sendMessage: ISendMessage,
    confirmationFunction?: (err: any, ok: Replies.Empty) => void,
  ): Promise<void> {
    try {
      await this.initializationCheck();
      this.baseChannel.publish(
        sendMessage.exchange,
        sendMessage.routingKey,
        sendMessage.content,
        {
          replyTo: sendMessage.options.replyTo,
          correlationId: sendMessage.options.correlationId,
        },
        confirmationFunction,
      );
    } catch (error) {
      throw new Error(`Failed to send message ${error}`);
    }
  }

  private async setUpConnect(connectOptions: IRMQConnectConfig): Promise<void> {
    try {
      this.connection = await connect(
        connectOptions,
        this.rmQoptions.extendedOptions?.socketOptions,
      );
      this.isConnected = true;
      this.logger.log(SUCCESSFUL_CONNECT);

      this.connection.on(CLOSE_EVENT, (err) => {
        this.isConnected = false;
        this.logger.error(`${CLOSE_MESSAGE}: ${err.message}`);
        this.reconnect(connectOptions);
      });

      this.connection.on(CONNECT_ERROR, (err) => {
        this.logger.error(`${CONNECT_FAILED_MESSAGE}: ${err.message}`);
      });
      this.connection.on(CONNECT_BLOCKED, (err) => {
        this.logger.error(`${CONNECT_BLOCKED_MESSAGE}: ${err.message}`);
      });
    } catch (err) {
      this.logger.error(`Failed to connect: ${err.message}`);
    }
  }

  private async reconnect(options: IRMQConnectConfig): Promise<void> {
    this.logger.log('Attempting to reconnect...');
    setTimeout(async () => {
      try {
        await this.setUpConnect(options);
      } catch (err) {
        this.logger.error(`Reconnection failed: ${err.message}`);
        this.reconnect(options);
      }
    }, RECONNECTION_INTERVAL);
  }
  private async setUpChannels() {
    try {
      const { extendedOptions } = this.rmQoptions;
      const isConfirmChannel =
        extendedOptions?.typeChannel === TypeChannel.CONFIRM_CHANNEL;

      this.baseChannel = isConfirmChannel
        ? await this.createConfirmChannel()
        : await this.createChannel();

      this.replyToChannel = await this.createChannel();

      if (extendedOptions?.prefetch)
        await this.prefetch(extendedOptions.prefetch);
    } catch (error) {
      console.error('Error setting up channels:', error);
      throw error;
    }
  }

  private prefetch(prefetch: IPrefetch): Promise<Replies.Empty> {
    return this.baseChannel.prefetch(prefetch.count, prefetch.isGlobal);
  }

  async sendToQueue(
    queue: string,
    content: Buffer,
    options?: Options.Publish,
  ): Promise<boolean> {
    try {
      await this.initializationCheck();
      return this.baseChannel.sendToQueue(queue, content, options);
    } catch (error) {
      throw new Error(`Failed to send message ${error}`);
    }
  }
  private async initializationCheck() {
    if (this.isInitialized) return;
    await new Promise<void>((resolve) =>
      setTimeout(resolve, INITIALIZATION_STEP_DELAY),
    );
    await this.initializationCheck();
  }
  private async createChannel() {
    return await this.connection.createChannel();
  }
  private async createConfirmChannel() {
    return await this.connection.createConfirmChannel();
  }
  async onModuleDestroy(): Promise<void> {
    await this.baseChannel.close();
    await this.replyToChannel.close();
    await this.connection.close();
  }
}
