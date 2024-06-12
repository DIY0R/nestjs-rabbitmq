import { Inject, Injectable } from '@nestjs/common';
import { RMQ_CONNECT_OPTIONS } from './constants';
import { RabbitMQConfig } from './interfaces/connection';
import { Channel, Connection, connect } from 'amqplib';

@Injectable()
export class RmqNestjsConnectService {
  private connection: Connection = null;
  private baseChannel: Channel = null;
  private replyToChannel: Channel = null;

  private declared = false;
  constructor(
    @Inject(RMQ_CONNECT_OPTIONS) private readonly options: RabbitMQConfig,
  ) {}
  async onModuleInit(): Promise<void> {
    if (this.declared) throw Error('Root RmqNestjsModule already declared!');
    await this.setUpConnect(this.options);
    this.createChannels();
    this.declared = true;
  }

  private async setUpConnect(options: RabbitMQConfig) {
    const { username, password, hostname, port, virtualHost } = options;
    const url = `amqp://${username}:${password}@${hostname}:${port}/${virtualHost}`;

    this.connection = await connect(url);
    console.log(this.connection);
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
