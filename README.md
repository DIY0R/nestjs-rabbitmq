# Nest.js with RabbitMQ

[![npm version](https://badgen.net/npm/v/nestjs-rabbitmq-bridge)](https://www.npmjs.com/package/nestjs-rabbitmq-bridge)
[![npm version](https://badgen.net/npm/license/nestjs-rabbitmq-bridge)](https://www.npmjs.com/package/nestjs-rabbitmq-bridge)
[![checker](https://github.com/DIY0R/nestjs-rabbitmq-bridge/actions/workflows/main.yml/badge.svg?branch=main)](https://github.com/DIY0R/nestjs-rabbitmq-bridge/actions/workflows/main.yml)

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

const syncOptions: IRabbitMQConfig =
  {
    username: 'for-test',
    password: 'for-test',
    hostname: 'localhost',
    port: 5672,
    vhost: 'local',
    protocol: 'amqp',
  } || 'amqp://for-test:for-test@localhost:5672/local';

const asyncOptions: IRabbitMQConfigAsync = {
  useFactory: (...args: any[]) => syncOptions,
  inject: [],
};

const appOptions: IGlobalOptions = {
  typeChanel: TypeChanel.CONFIR_CHANEL,
  globalBroker: {
    replyTo: {
      queue: '',
      options: { exclusive: true },
      consumOptions: { noAck: true },
    },
    messageTimeout: 50000,
    serviceName: 'global service',
  },
  socketOptions: {
    clientProperties: { connection_name: 'myFriendlyName' },
  },
};

@Module({
  imports: [RmqNestjsModule.forRoot(syncOptions, appOptions)],
  providers: [RmqSenderGlobalService],
})
// or asynchronously
@Module({
  imports: [RmqNestjsModule.forRootAsync(asyncOptions, appOptions)],
  providers: [RmqSenderGlobalService],
})
export class AppModule {}
```

In `forRoot(syncOptions, appOptions)`, we pass two arguments for the connection and an optional argument for environment settings:

- **syncOptions** - standard parameters [amqlib.connect](https://amqp-node.github.io/amqplib/channel_api.html#connect) for connection. Parameters can be an object or a URL.
- **appOptions** - environment settings (optional)

  - **typeChanel** - [channel type](https://amqp-node.github.io/amqplib/channel_api.html#channels), default is `TypeChanel.CHANEL`
  - **globalBroker** - specify if you want to use RPC from `RmqGlobalService`
    - **replyTo** - needed for setting up the `replyTo` queue
      - **queue** - queue name. It's recommended to leave it as an empty string so RabbitMQ will automatically generate a unique name.
      - **options** - options passed as the second parameter in [assertQueue](https://amqp-node.github.io/amqplib/channel_api.html#channel_assertQueue)
      - **consumOptions** - configure the consumer with a callback that will be invoked with each message. [See](https://amqp-node.github.io/amqplib/channel_api.html#channel_consume)
    - **messageTimeout** - Number of milliseconds the `send` method will wait for the response before a timeout error. Default is 40,000.
    - **serviceName** - an arbitrary identifier for the originating application
    - **socketOptions** - here you can configure SSL/TLS [see](https://amqp-node.github.io/amqplib/ssl.html) and [Client properties](https://amqp-node.github.io/amqplib/channel_api.html#client-properties)

We recommend specifying the `TypeChanel.CONFIR_CHANEL` channel type to get more accurate statuses for your requests.

Once you have successfully connected, `RmqGlobalService` will be available globally, and you can import your module from any part of your application.

## RmqGlobalService

```typescript
interface IReply {
  message: object;
}

interface ISend {
  age: number;
  name: string;
}

@Injectable()
export class RmqSenderGlobalService {
  private channel;
  constructor(private readonly rmqGlobalService: RmqGlobalService) {
    this.channel = rmqGlobalService.channel;
  }

  async sendMessage(obj: ISend) {
    const message = await this.rmqGlobalService.send<ISend, IReply>(
      'exchange',
      'topic',
      obj,
    );
    return message;
  }

  async sendNotify(obj: ISend) {
    const { status } = await this.rmqGlobalService.notify<ISend>(
      'exchange',
      'topic',
      obj,
    );
    return status;
  }

  sendToQueue(queue: string, message: Record<string, any>) {
    const status = this.rmqGlobalService.sendToQueue<object>(queue, message);
    return status;
  }
}
```

If you have defined `globalBroker` in `forRoot`, you will have access to the RPC method `send`, otherwise, you will catch an error when calling it.

- **'this.rmqGlobalService.send<ISend, IReply>(exchange, topic, options)'** - asynchronous request

  - **exchange** - exchange name
  - **topic** - topic name
  - **options** - standard [publish options](https://amqp-node.github.io/amqplib/channel_api.html#channelpublish)
    - **timeout** - if supplied, the message will have its own timeout.

- **'this.rmqGlobalService.notify<ISend>(exchange, topic, options)'** - asynchronous request that returns the message status
- **'this.rmqGlobalService.sendToQueue()'** - standard method [sendToQueue](https://amqp-node.github.io/amqplib/channel_api.html#channel_sendToQueue)

We recommend specifying interfaces for the objects you send and receive.

If you want access to the standard RabbitMQ channel, you always have access to `this.rmqGlobalService.channel` and all its methods [See](https://amqp-node.github.io/amqplib/channel_api.html#channel).

# Creating Exchange, Queue, and Listening

We recommend having one exchange per module, so we suggest using the `forFeature` method!

```typescript
@Module({
  imports: [
    RmqNestjsModule.forFeature({
      exchange: {
        exchange: 'exchange_name',
        type: 'topic',
        options: {
          durable: true,
          autoDelete: true,
        },
      },
      queue: {
        queue: 'queue',
        options: { durable: true },
        consumOptions: { noAck: false },
      },
      replyTo: {
        queue: '',
        options: { exclusive: true },
        consumOptions: { noAck: true },
      },
    }),
  ],
  providers: [RegisterService, RmqEvents],
})
export class RegisterModule {}
```

In the `forFeature(Object)` method, you need to pass an object of type `IMessageBroker`:

- **exchange** - exchange parameters
  - **exchange** - The name of the exchange, which should be unique.
  - **type** - exchange type
  - **options** - The default queue parameters from `Options.AssertExchange`. See [Channel.assertExchange](https://amqp-node.github.io/amqplib/channel_api.html#channel_assertExchange).
- **queue** - An object containing the queue parameters. (optional)
  - **queue** - The name of the queue, which should be unique.
  - **options** - The default queue parameters from `Options.AssertQueue`. See [Channel AssertQueue](https://amqp-node.github.io/amqplib/channel_api.html#channel_assertQueue).
  - **consumOptions** - configure the consumer with a callback that will be invoked with each message. [See](https://amqp-node.github.io/amqplib/channel_api.html#channel_consume)
- **replyTo** - needed for setting up the `replyTo` queue
  - queue - The name of the queue, which should be unique.
  - options - The default queue parameters from `Options.AssertQueue`. See [Channel AssertQueue](https://amqp-node.github.io/amqplib/channel_api.html#channel_assertQueue).
  - consumOptions - configure the consumer with a callback that will be invoked with each message. See
- **serviceName** - The name of your service. (optional)
- **messageTimeout** - The timeout for waiting for a response, with a default value of 40000ms. (optional)

If you just want to send messages and receive responses, simply specify the exchange and replyTo, and you will have access to all methods from `RmqService` as shown below.

If everything is set up correctly, `RmqService` will be available in your module!

## RmqService

### send and notify methods

```typescript
@Injectable()
export class RegisterService {
  constructor(private readonly rmqService: RmqService) {}

  async sendMessage(obj: Record<string, any>, topic: string = 'text.text') {
    const sendhi = await this.rmqService.send<object, { message: object }>(
      topic,
      obj,
    );
    return sendhi;
  }

  async sendNotifyService(obj

: Record<string, any>) {
    const message = await this.rmqService.notify<object>('notify.rpc', obj);
    return message;
  }
```

- **'this.rmqService.send<ISend, IReply>(topic, options)'** - asynchronous request

  - **topic** - topic name
  - **options** - standard [publish options](https://amqp-node.github.io/amqplib/channel_api.html#channelpublish)
    - **timeout** - if supplied, the message will have its own timeout.

- **'this.rmqService.notify<ISend>(topic, options)'** - asynchronous request that returns the message status

Additional available methods:

- **'this.rmqService.ack(...params)'** - Acknowledge the given message, or all messages up to and including the given message. [See](https://amqp-node.github.io/amqplib/channel_api.html#channelack)
- **'this.rmqService.nack(...params)'** - Reject a message. This instructs the server to either requeue the message or throw it away (which may result in it being dead-lettered). [See](https://amqp-node.github.io/amqplib/channel_api.html#channelnack)

Note that in these examples we do not specify the exchange in the requests because the `send` and `notify` methods use the exchange specified in `forFeature`.

## RmqEvents: Listening to the Queue

In `nestjs-rabbitmq-bridge`, requests are processed through the `@MessageRoute` and `@MessageNonRoute` decorators.

```typescript
@Injectable()
export class RmqEvents {
  constructor(private readonly rmqService: RmqService) {}
  @MessageRoute('text.text')
  received(obj: any, consumeMessage: ConsumeMessage) {
    this.rmqService.ack(consumeMessage); // call if 'consumOptions: { noAck: false }'
    return { message: obj };
  }
  @MessageRoute('*.*.rpc') // subscribe with a pattern!
  receivedTopic(obj: any, consumeMessage: ConsumeMessage) {
    return { message: obj };
  }
  @MessageRoute('rpc.#') // subscribe with a pattern!
  receivedTopicPattern(obj: any, consumeMessage: ConsumeMessage) {
    //...
    return { message: obj };
  }
  @MessageRoute('notify.rpc')
  receivedTopicNotify(obj: any, consumeMessage: ConsumeMessage) {
    this.rmqService.ack(consumeMessage);
    //...
  }
  @MessageNonRoute()
  receivedNonRoute(obj: any, consumeMessage: ConsumeMessage) {
    this.rmqService.ack(consumeMessage);
    return { message: obj };
  }
}
```

```ts
@MessageRoute(RoutingKey: string)
method(message: ISend, consumeMessage: ConsumeMessage) {}
```

- `message` - what the listener receives
- `consumeMessage` - more information from the message (not just content)

If you want to manually acknowledge messages, set `consumOptions: { noAck: false }` in the queue. If you want the library to automatically acknowledge messages, set `noAck: true`, so you don't have to explicitly call `ack`.

The `@MessageRoute` decorator will automatically bind the queue and RoutingKey to the exchange specified in the `forFeature` method, and this routing key will only be visible inside the `RegisterModule`. Just like magic!

In some cases, when a non-processable message arrives in the queue, it will stay there forever unless it is processed. In such cases, the `@MessageNonRoute()` decorator can help. The method bound to this decorator will be called only when the request cannot find a bound routing key to the exchange.
