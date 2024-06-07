export interface RabbitMQConfig {
  username: string;
  password: string;
  hostname: string;
  port?: number;
  virtualHost?: string;
}
