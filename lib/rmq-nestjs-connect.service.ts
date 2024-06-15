import {
  Inject,
  Injectable,
  OnModuleDestroy,
  OnModuleInit,
} from '@nestjs/common';
import { RMQ_CONNECT_OPTIONS } from './constants';
import {
  IRabbitMQConfig,
  IExchange,
  IQueue,
  TypeQueue,
  BindQueue,
} from './interfaces';
import { Channel, Connection, Replies, connect } from 'amqplib';

@Injectable()
export class RmqNestjsConnectService implements OnModuleInit, OnModuleDestroy {
  private connection: Connection = null;
  private baseChannel: Channel = null;
  private replyToChannel: Channel = null;

  private declared = false;
  constructor(
    @Inject(RMQ_CONNECT_OPTIONS) private readonly options: IRabbitMQConfig
  ) {}
  async onModuleInit(): Promise<void> {
    if (this.declared) throw Error('Root RmqNestjsModule already declared!');
    await this.setUpConnect(this.options);
    await this.createChannels();
    this.declared = true;
  }

  public async assertExchange(
    options: IExchange
  ): Promise<Replies.AssertExchange> {
    try {
      const exchange = await this.baseChannel.assertExchange(
        options.exchange,
        options.type,
        options.options
      );
      return exchange;
    } catch (error) {
      throw new Error(
        `Failed to assert exchange '${options.exchange}': ${error.message}`
      );
    }
  }
  public async assertQueue(
    typeQueue: TypeQueue,
    options: IQueue
  ): Promise<Replies.AssertQueue> {
    try {
      if (typeQueue == TypeQueue.QUEUE) {
        const queue = await this.baseChannel.assertQueue(
          options.queue,
          options.options
        );
        return queue;
      }
      const queue = await this.replyToChannel.assertQueue(
        options.queue || '',
        options.options
      );
      return queue;
    } catch (error) {
      throw new Error(`Failed to assert ${typeQueue} queue: ${error.message}`);
    }
  }
  async bindQueue(bindQueue: BindQueue): Promise<void> {
    try {
      await this.baseChannel.bindQueue(
        bindQueue.queue,
        bindQueue.source,
        bindQueue.pattern,
        bindQueue.args
      );
    } catch (error) {
      throw new Error(
        `Failed to Bind Queue ,source:${bindQueue.source} queue: ${bindQueue.queue}`
      );
    }
  }
  private async setUpConnect(options: IRabbitMQConfig) {
    const { username, password, hostname, port, virtualHost } = options;
    const url = `amqp://${username}:${password}@${hostname}:${port}/${virtualHost}`;
    this.connection = await connect(url);
  }
  private async createChannels() {
    try {
      this.baseChannel = await this.createChannel();
      this.replyToChannel = await this.createChannel();
    } catch (error) {
      throw error;
    }
  }

  private async createChannel() {
    try {
      return await this.connection.createChannel();
    } catch (error) {
      throw error;
    }
  }
  async onModuleDestroy(): Promise<void> {
    await this.baseChannel.close();
    await this.replyToChannel.close();
    await this.connection.close();
  }
}
