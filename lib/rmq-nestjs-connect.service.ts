import { Inject, Injectable } from '@nestjs/common';
import { RMQ_CONNECT_OPTIONS } from './constants';
import * as amqplib from 'amqplib';
import { RabbitMQConfig } from './interfaces/connection';
import amqp, {
  AmqpConnectionManager,
  ChannelWrapper,
} from 'amqp-connection-manager';

@Injectable()
export class RmqNestjsConnectService {
  private connection: AmqpConnectionManager = null;
  private baseChanel: ChannelWrapper = null;
  private replyToChannel: ChannelWrapper = null;

  private declared = false;
  constructor(
    @Inject(RMQ_CONNECT_OPTIONS) private readonly options: RabbitMQConfig,
  ) {}
  async onModuleInit(): Promise<void> {
    if (this.declared) throw Error('Root RmqNestjsModule already declared!');
    await this.connect(this.options);
    this.createChanels();
    this.declared = true;
  }

  private async connect(options: RabbitMQConfig) {
    const { username, password, hostname, port, virtualHost } = options;
    const url = `amqp://${username}:${password}@${hostname}:${port}/${virtualHost}`;
    const connect = amqp.connect(url);
    this.connection = connect;
  }
  private async createChanels() {
    this.baseChanel = this.connection.createChannel({ json: true });
    this.replyToChannel = this.connection.createChannel({ json: true });
  }
  async onModuleDestroy(): Promise<void> {
    await this.baseChanel.close();
    await this.replyToChannel.close();
    await this.connection.close();
  }
}
