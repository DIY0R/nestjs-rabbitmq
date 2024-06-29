# Nest.js with Rabittmq

[![npm version](https://badgen.net/npm/v/nestjs-rabbitmq-bridge)](https://www.npmjs.com/package/nestjs-rabbitmq-bridge)
[![npm version](https://badgen.net/npm/license/nestjs-rabbitmq-bridge)](https://www.npmjs.com/package/nestjs-rabbitmq-bridge)
[![checker](https://github.com/DIY0R/nestjs-rabbitmq-bridge/actions/workflows/main.yml/badge.svg?branch=main)](https://github.com/DIY0R/nestjs-rabbitmq-bridge/actions/workflows/main.yml)

## ❗The documentation has not been fully written yet is being written

---

## Documentation

### Installation

Start by installing the `nestjs-rabbitmq-bridge` package:

```bash
npm i nestjs-rabbitmq-bridge
```

### Importing the Module

In your root module, import `RmqNestjsModule`:

```typescript
import {
  RmqNestjsModule,
  IRabbitMQConfig,
  IRabbitMQConfigAsync,
} from 'nestjs-rabbitmq-bridge';

const syncOptions: IRabbitMQConfig = {
  username: 'for-test',
  password: 'for-test',
  hostname: 'localhost',
  port: 5672,
  virtualHost: '/', // your virtual host, see RabbitMQ panel
};

const asyncOptions: IRabbitMQConfigAsync = {
  useFactory: (...args: any[]) => syncOptions,
  inject: [],
};

@Module({
  imports: [RmqNestjsModule.forRoot(syncOptions)],
})
// or asynchronously
@Module({
  imports: [RmqNestjsModule.forRootAsync(asyncOptions)],
})
export class AppModule {}
```

The first parameter in `forRoot` is `IRabbitMQConfig`. Optionally, you can pass an implementation of the `IAppOptions` interface as the second parameter to customize the logger, error handler, etc.

By following the above steps, you have successfully connected to RabbitMQ, and a connection pool is established.

### Creating Exchange and Queue

```typescript
@Module({
  imports: [
    RmqNestjsModule.forFeature({
      exchange: {
        exchange: 'register',
        type: 'topic',
        options: { durable: true },
      },
      queue: {
        queue: 'register.register',
        options: { durable: true },
      },
      replyTo: { exclusive: true },
      serviceName: 'Register',
      messageTimeout: 50000,
    }),
  ],
  providers: [RegisterService],
})
export class RegisterModule {}
```

In the `forFeature()` method, you need to pass an object of type `IMessageBroker`:

- **exchange** - The name of the exchange, which should be unique.
- **queue** - An object containing the queue parameters. (optional)
  - **queue** - The name of the queue, which should be unique.
  - **options** - The default queue parameters from `Options.AssertQueue`. See [Channel AssertQueue](https://amqp-node.github.io/amqplib/channel_api.html#channel_assertQueue).
- **replyTo** - The default queue parameters from `Options.AssertQueue`. See [Channel AssertQueue](https://amqp-node.github.io/amqplib/channel_api.html#channel_assertQueue). (optional)
- **serviceName** - The name of your service. (optional)
- **messageTimeout** - The timeout for waiting for a response, with a default value of 40000ms. (optional)
