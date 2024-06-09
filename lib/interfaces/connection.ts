import { ModuleMetadata } from '@nestjs/common';

export interface RabbitMQConfig {
  username: string;
  password: string;
  hostname: string;
  port?: number;
  virtualHost?: string;
}

export interface IRMQSRootAsyncOptions extends Pick<ModuleMetadata, 'imports'> {
  useFactory?: (...args: any[]) => Promise<RabbitMQConfig> | RabbitMQConfig;
  inject?: any[];
}
