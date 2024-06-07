import { Inject, Injectable } from '@nestjs/common';
import { RMQ_CONNECT_OPTIONS } from './constants';
import { connect } from 'amqplib';
import { RabbitMQConfig } from './interfaces/connection';

@Injectable()
export class RmqNestjsConnectService {
  private connection: any;

  constructor(
    @Inject(RMQ_CONNECT_OPTIONS) private readonly options: RabbitMQConfig,
  ) {}
  async onModuleInit(): Promise<void> {
    await this.connect(this.options);
  }

  private async connect(options: RabbitMQConfig) {
    const { username, password, hostname, port, virtualHost } = options;
    const url = `amqp://${username}:${password}@${hostname}:${port}/${virtualHost}`;
    const connection = await connect(url);
    this.connection = connection;
  }
}
