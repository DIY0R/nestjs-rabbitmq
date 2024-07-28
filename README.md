# Nest.js with RabbitMQ

[![version](https://img.shields.io/npm/v/@diy0r/nestjs-rabbitmq.svg)](https://www.npmjs.com/package/@diy0r/nestjs-rabbitmq)
[![license](https://badgen.net/npm/license/@diy0r/nestjs-rabbitmq)](https://www.npmjs.com/package/@diy0r/nestjs-rabbitmq)
[![checker](https://github.com/DIY0R/nestjs-rabbitmq/actions/workflows/main.yml/badge.svg?branch=main)](https://github.com/DIY0R/nestjs-rabbitmq/actions/workflows/main.yml)

---

# Contents

- [Installation](#installation)
- [Module Initialization](#module-initialization)
  - [ForRoot](#forroot)
  - [ForRootAsync - Async initialization](#forrootasync-async-initialization)
  - [Connect via URL](#connect-via-url)
- [RmqGlobalService](#rmqglobalservice)
  - [notify](#method-notify-if-you-want-to-just-notify-services)
  - [send (RPC)](#method-send)
  - [Send to Queue](#method-sendtoqueue)
  - [Access to the channel](#channel)
  - [Serialization/Deserialization](#serializationdeserialization)
- [Module-Specific Configuration (forFeature)](#module-specific-configuration-forfeature)
  - [Import module](#import-and-usage)
  - [Receiving messages](#receiving-messages)
  - [Middleware](#middleware)
  - [Interceptor](#interceptor)
  - [RmqService](#rmqservice)
    - [send(RPC) and notify - methods](#send-and-notify---methods)
    - [healthCheck, ack and nack - methods](#healthcheckack-and-nack---methods)
  - [Serialization/Deserialization in specific module](#serializationdeserialization-in-specific-module)

## Installation

Start by installing the `@diy0r/nestjs-rabbitmq` package:

```bash
npm i @diy0r/nestjs-rabbitmq
```

## Module Initialization

In your root module, import `RmqModule`:

### ForRoot

```typescript
import { RmqModule, IRabbitMQConfig } from '@diy0r/nestjs-rabbitmq';

const appOptions: IGlobalOptions = {
  typeChannel: TypeChannel.CONFIR_CHANNEL,
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
  imports: [
    RmqModule.forRoot(
      {
        username: 'for-test',
        password: 'for-test',
        hostname: 'localhost',
        port: 5672,
        vhost: 'local',
        protocol: 'amqp',
      },
      appOptions,
    ),
  ],
  providers: [SomeService],
})
export class AppModule {}
```

### ForRootAsync (Async initialization)

```typescript
import { RmqModule, IRabbitMQConfigAsync } from '@diy0r/nestjs-rabbitmq';
const asyncOptions: IRabbitMQConfigAsync = {
  useFactory: (...args: any[]) => ({
    username: 'for-test',
    password: 'for-test',
    hostname: 'localhost',
    port: 5672,
    vhost: 'local',
    protocol: 'amqp',
  }),
  inject: [],
};
@Module({
  imports: [RmqModule.forRootAsync(asyncOptions, appOptions)],
  providers: [SomeService],
})
export class AppModule {}
```

### Connect via URL

You can also connect using the standard URL. For more information, see the [RabbitMQ URI Specification](https://www.rabbitmq.com/docs/uri-spec).

```typescript
RmqModule.forRoot('amqp://for-test:for-test@localhost:5672/local', appOptions);
```

<br/>
In `forRoot(syncOptions, appOptions)`, we pass two arguments for the connection and an optional argument for environment settings:

- **syncOptions** - standard parameters [amqlib.connect](https://amqp-node.github.io/amqplib/channel_api.html#connect) for connection. Parameters can be an object or a URL.
- **appOptions** - environment settings (optional)

  - **typeChannel** - [channel type](https://amqp-node.github.io/amqplib/channel_api.html#channels), default is `TypeChannel.CHANNEL`
  - **globalBroker** - specify if you want to use RPC from `RmqGlobalService`
    - **replyTo** - needed for setting up the `replyTo` queue
      - **queue** - queue name. It's recommended to leave it as an empty string so RabbitMQ will automatically generate a unique name.
      - **options** - options passed as the second parameter in [assertQueue](https://amqp-node.github.io/amqplib/channel_api.html#channel_assertQueue)
      - **consumOptions** - configure the consumer with a callback that will be invoked with each message. [See](https://amqp-node.github.io/amqplib/channel_api.html#channel_consume)
    - **messageTimeout** - Number of milliseconds the `send` method will wait for the response before a timeout error. Default is 40,000.
    - **serviceName** - an arbitrary identifier for the originating application
    - **socketOptions** - here you can configure SSL/TLS [see](https://amqp-node.github.io/amqplib/ssl.html) and [Client properties](https://amqp-node.github.io/amqplib/channel_api.html#client-properties)

We recommend specifying the `TypeChannel.CONFIR_CHANNEL` channel type to get more accurate statuses for your requests.

## RmqGlobalService

After successful connection, `RmqGlobalService` will be available globally and you will be able to import your module from any part of your application and send messages.

```typescript
@Injectable()
export class SomeService {
  constructor(private readonly rmqGlobalService: RmqGlobalService) {}

  //...
}
```

We recommend specifying interfaces for the objects you send and receive.

```ts
interface IReply {
  message: object;
}

interface ISend {
  age: number;
  name: string;
}
```

### Method `notify` If you want to just notify services

```ts
async sendNotify(obj: ISend) {
    const { status } = await this.rmqGlobalService.notify<ISend>(
      'exchange',
      'user.login',
      obj,
    );
    return status;
  }
```

- **'this.rmqGlobalService.notify<ISend>(exchange, routingKey, options)'** - asynchronous request that returns the message status
  - **exchange** - exchange name
  - **routingKey** - routing key
  - **options** - standard [publish options](https://amqp-node.github.io/amqplib/channel_api.html#channelpublish) (optional)

### Method `send`

If you have defined `globalBroker` in `forRoot`, you will have access to the RPC method `send`,otherwise, you will catch an error when calling it.

```ts
  async sendMessage(obj: ISend) {
    const message = await this.rmqGlobalService.send<ISend, IReply>(
      'exchange name',
      'user.rpc',
      obj,
    );
    return message;
  }
```

- **'this.rmqGlobalService.send<ISend, IReply>(exchange, routingKey, options)'** - asynchronous request.

  - **exchange** - exchange name
  - **routingKey** - routing key
  - **options** - standard [publish options](https://amqp-node.github.io/amqplib/channel_api.html#channelpublish) (optional)
    - **timeout** - if supplied, the message will have its own timeout.(custom parameter)

### Method `sendToQueue`

Unlike the standard [sendToQueue](https://amqp-node.github.io/amqplib/channel_api.html#channel_sendToQueue) method from amqlib, this asynchronous method differs in that messages go through [Serialization](#serializationdeserialization) before being sent.

```ts
 async sendToQueue(queue: string, obj:ISend) {
    const status = await this.rmqGlobalService.sendToQueue<ISend>(queue, obj);
    return status;
  }
```

Return either true, meaning “keep sending”, or false, meaning “please wait for a ‘drain’ event”.[See Flow control
](https://amqp-node.github.io/amqplib/channel_api.html#flowcontrol)

- **'this.rmqGlobalService.sendToQueue()'** - asynchronous function
  - queue - queue name

### Channel

If you want access to the standard RabbitMQ channel, you always have access to async getter `this.rmqGlobalService.channel` and all its methods [See](https://amqp-node.github.io/amqplib/channel_api.html#channel).

```ts
 async getChannel() {
    const channel: Channel | ConfirmChannel = await this.rmqGlobalService.channel;
    return channel;
  }
```

### Serialization/Deserialization

By default, messages are parsed using the JSON.parse method when they are received and converted to a string using JSON.stringify when they are published. If you want to change this behavior you can use your own parsers.

```ts
const appOptions: IGlobalOptions = {
  serDes: {
    deserialize: (message: Buffer): any => OtherDeserializer(message),
    serialize: (message: any): Buffer => OtherSerialize(message),
  },
  ...
};
```

#### Method `deserialize`

The `deserialize` method is responsible for converting a message from its raw format (typically a Buffer in Node.js) into a JavaScript object or another suitable format for processing.

#### Method `serialize`

The `serialize` method is responsible for converting a JavaScript object or any other data format into a raw format (typically a Buffer) suitable for transmission over RabbitMQ.

In this case, it will be applied to all methods of [`RmqGlobalService`](#RmqGlobalService).

## Module-Specific Configuration (forFeature)

The `forFeature` method allows configuring RabbitMQ parameters at the specific module level in your NestJS application. This is useful for setting up different exchanges, queues, and other RabbitMQ parameters specific to that module.

### Import and Usage

To use forFeature in your module, import `RmqModule` and configure the parameters in the `forFeature` method.

```typescript
@Module({
  imports: [
    RmqModule.forFeature({
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
  providers: [MyService, MyRmqEvents],
})
export class MyModule {}
```

In the `forFeature(MessageBroker)` method, you need to pass an object of type `IMessageBroker`:

- **exchange** - exchange parameters
  - **exchange** - The name of the exchange, which should be unique.
  - **type** - exchange type (Currently only the topic is supported)
  - **options** - The default queue parameters from `Options.AssertExchange`.(optional) See [Channel.assertExchange](https://amqp-node.github.io/amqplib/channel_api.html#channel_assertExchange).
- **queue** - An object containing the queue parameters. (optional)
  - **queue** - The name of the queue, which should be unique.
  - **options** - The default queue parameters from `Options.AssertQueue`. See [Channel AssertQueue](https://amqp-node.github.io/amqplib/channel_api.html#channel_assertQueue).
  - **consumOptions** - configure the consumer with a callback that will be invoked with each message. See [Channel Consume](https://amqp-node.github.io/amqplib/channel_api.html#channel_consume)
- **replyTo** - needed for setting up the `replyTo` queue (optional)
  - queue - The name of the queue, which should be unique.
  - options - The default queue parameters from `Options.AssertQueue`. See [Channel AssertQueue](https://amqp-node.github.io/amqplib/channel_api.html#channel_assertQueue).
  - consumOptions - configure the consumer with a callback that will be invoked with each message. See [Channel Consume](https://amqp-node.github.io/amqplib/channel_api.html#channel_consume)
- **serviceName** - The name of your service. (optional)
- **messageTimeout** - The timeout for waiting for a response, with a default value of 40000ms. (optional)

### Receiving messages

In `@diy0r/nestjs-rabbitmq`, requests are processed through the `@MessageRoute` and `@MessageNonRoute` decorators. You need to declare the `queue` to use these decorators.

```typescript
@Injectable()
export class MyRmqEvents {
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
  @MessageRoute('*.rpc.mix.#') //subscribe with a mix pattern!
  recivedMixTopic(obj: any, consumeMessage: ConsumeMessage) {
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
- `consumeMessage` - more information from the message (not just content) from amqlib

The @MessageRoute decorator will automatically bind the queue and RoutingKey to the exchange specified in the forFeature method, and this routing key will only be visible inside the specific module (e.g., [`MyModule`](#import-and-usage)). Just like magic! <br/>
In some cases, when a non-processable message arrives in the queue, it will stay there forever unless it is processed. In such cases, the `@MessageNonRoute` decorator can help. The method bound to this decorator will be called only when the request cannot find a bound routing key to the exchange.

If you want to manually acknowledge messages, set `consumOptions: { noAck: false }` in the queue. If you want the library to automatically acknowledge messages, set `noAck: true`, so you don't have to explicitly call `ack`.

### Middleware

Middleware allows you to execute additional logic before message processing.You can declare middleware at various levels, including the module level, provider level, and specific endpoint level.
It's important to note that the middleware runs before any interceptors.

To declare an middleware, implement the `IRmqMiddleware` abstract class.

```ts
export class EventMiddleware implements IRmqMiddleware {
  async use(message: ConsumeMessage, content: any): Promise<void | any> {
    content.args = '1,2,...';
  }
}
```

or you can directly return:

```ts
export class EventMiddleware implements IRmqMiddleware {
  async use(message: ConsumeMessage, content: any): Promise<void | any> {
    if (content.args !== '2,1') return { status: 'error' };
  }
}
```

If nothing is returned, the execution of the middleware chain will continue.

EventMiddleware implements the `use` method, which takes two parameters: `message`, which is the standard `ConsumeMessage` from amqplib, and `content`, which is your message that has passed through [deserialization](#serializationdeserialization-in-specific-module).

#### Module Level

At the module level, you can declare middleware that will apply to all message handlers within that module.

```ts
@Module({
  imports: [
    RmqModule.forFeature({
      exchange: {
        /* exchange parameters */
      },
      queue: {
        /* queue parameters */
      },
      middlewares: [EventMiddleware, OtherMiddleware], // Middleware is applied to all handlers in the module
    }),
  ],
  providers: [MyService, MyRmqEvents],
})
export class MyModule {}
```

#### Provider Level

At the provider level, you can declare middleware that will apply to all message handlers within that provider.

```ts
@Injectable()
@RmqMiddleware(EventMiddleware) // Middleware is applied to all methods in the MyRmqEvents
export class MyRmqEvents {
  @MessageRoute('text.text')
  received(obj: any, consumeMessage: ConsumeMessage) {
    return { message: obj };
  }

  // Class methods ...
}
```

#### Specific Endpoint Level

Middleware can be applied at the specific endpoint (method) level.

```ts
@Injectable()
export class MyRmqEvents {
  @MessageRoute('text.text')
  @RmqMiddleware(EventMiddleware) // Middleware is applied only to this method
  handleTextText(obj: any, consumeMessage: ConsumeMessage) {
    return { message: obj };
  }
}
```

<br/>

    Initially, middleware at the module level will be invoked, then at the class level, followed by the endpoint level.

### Interceptor

Interceptors allow you to intercept and modify the processing of a message both before and after it is processed by a handler, just like [Interceptors from Nest.js](#https://docs.nestjs.com/interceptors). You can declare interceptors at various levels, including the module level, the provider level, and the specific endpoint level.
It's important to note that interceptors are executed after the middleware!

To declare an interceptor, implement the abstract class `IRmqInterceptor` with a decorator `@Injectable`.

```ts
@Injectable()
export class EventInterceptor implements IRmqInterceptor {
  constructor(private readonly rmqSerivce: RmqService) {}
  async intercept(
    message: ConsumeMessage,
    content: any,
  ): Promise<ReverseFunction> {
    console.log('Before...');
    return async (content: any, message: ConsumeMessage) => {
      console.log(`After... ${Date.now() - now}ms`);
    };
  }
}
```

EventInterceptor implements the `intercept` method, which takes two parameters: `message`, which is the standard `ConsumeMessage` from amqplib, and `content`, which is your message that has passed through [deserialization](#serializationdeserialization-in-specific-module). The `intercept` method returns an asynchronous function that will be invoked after processing.

#### Module Level

At the module level, you can declare interceptors that will apply to all message handlers within that module.

```ts
@Module({
  imports: [
    RmqModule.forFeature({
      exchange: {
        /* exchange parameters */
      },
      queue: {
        /* queue parameters */
      },
      interceptor: [EventInterceptor, OtherInterceptor], // Interceptor is applied to all handlers in the module!
    }),
  ],
  providers: [MyService, MyRmqEvents],
})
export class MyModule {}
```

The `interceptor` will be invoked from left to right.

#### Provider Level

At the provider level, you can declare interceptors that will apply to all message handlers within that provider.

```ts
@Injectable()
@RmqInterceptor(EventInterceptor) // Interceptor is applied to all methods in the MyRmqEvents
export class MyRmqEvents {
  @MessageRoute('text.text')
  received(obj: any, consumeMessage: ConsumeMessage) {
    return { message: obj };
  }

  // Class methods ...
}
```

#### Specific Endpoint Level

At the specific endpoint (method) level, allowing you to configure interceptor for each endpoint individually.

```ts
@Injectable()
export class MyRmqEvents {
  @MessageRoute('text.text')
  @RmqInterceptor(EventInterceptor) // Interceptor is applied only to this method
  handleTextText(obj: any, consumeMessage: ConsumeMessage) {
    return { message: obj };
  }
}
```

**Initially, interceptors at the module level will be invoked, then at the class level, followed by the endpoint level, and then in reverse order.**

### RmqService

If you just want to send messages and receive responses, simply specify the exchange and replyTo, and you will have access to all methods from RmqService as shown below.
It is mainly useful when you are writing an API gateway and want to maintain modularity.

#### send and notify - methods

```typescript
@Injectable()
export class MyService {
  constructor(private readonly rmqService: RmqService) {}

  async sendMessage(obj: ISend) {
    const message = await this.rmqGlobalService.send<ISend, IReply>(
      'user.rpc',
      obj,
    );
    return message;
  }

  async sendNotifyService(obj: Record<string, any>) {
    const message = await this.rmqService.notify<ISend>('notify.rpc', obj);
    return message;
  }
```

- **'this.rmqService.send<ISend, IReply>(routingKey, options)'** - asynchronous request

  - **routingKey** - routing key
  - **options** - standard [publish options](https://amqp-node.github.io/amqplib/channel_api.html#channelpublish) (optional) - **timeout** - if supplied, the message will have its own timeout.(custom parameter)

To use `send`, you must have `replyTo` declared in forFeature.

- **'this.rmqService.notify<ISend>(routingKey, options)'** - asynchronous request that returns the message status
  - **routingKey** - routing key
  - **options** - standard [publish options](https://amqp-node.github.io/amqplib/channel_api.html#channelpublish) (optional)

Note that in these examples we do not specify the exchange in the requests because the send and notify methods use the exchange specified on [MyModule](#import-and-usage) in method `forFeature`.

#### healthCheck,ack and nack - methods

```ts
const isConnected = this.rmqService.healthCheck();
```

**'this.rmqService.healthCheck()'** - Check if you are still connected to RMQ.

```ts
this.rmqService.ack(message);
```

- **'this.rmqService.ack(message:ConsumeMessage)'** - Acknowledge the given message, or all messages up to and including the given message. [See](https://amqp-node.github.io/amqplib/channel_api.html#channelack)

```ts
this.rmqService.nack(message);
```

- **'this.rmqService.nack(message:ConsumeMessage)'** - Reject a message. This instructs the server to either requeue the message or throw it away (which may result in it being dead-lettered). [See](https://amqp-node.github.io/amqplib/channel_api.html#channelnack)

### Serialization/Deserialization in specific module

The `serDes` allows for both the deserialization and serialization of messages.

It's important to note the execution order, as this is performed only once.
When a message reaches an endpoint, the framework checks for the `@SerDes` decorator on method(endpoint). If found, the methods specified there are used. If not, it searches for the decorator in the parent class(Provider). If the decorator is still not found, it falls back to using the `serDes` object from your module. If none of these are defined, the default serialization and deserialization are used.

#### Module Level

At the module level, the SerDes configuration applies to all message handlers within that module. This is useful for ensuring consistent message processing across the entire module.

```ts
@Module({
  imports: [
    RmqModule.forFeature({
      exchange: {
        /* exchange parameters */
      },
      queue: {
        /* queue parameters */
      },
      serDes: {
        deserialize: (message: Buffer): any => OtherDeserializer(message),
        serialize: (message: any): Buffer => OtherSerializer(message),
      }, // serDes is applied to all handlers in the module!
    }),
  ],
})
export class MyModule {}
```

#### Provider Level

You can also configure SerDes at the provider level, applying it to all message handlers within a specific class(provider).

```ts
@Injectable()
@SerDes({
  deserialize: (message: Buffer): any => OtherDeserializer(message),
  serialize: (message: any): Buffer => OtherSerializer(message),
}) // SerDes is applied to all methods in the MyRmqEvents
export class MyRmqEvents {
  @MessageRoute('text.text')
  received(obj: any, consumeMessage: ConsumeMessage) {
    return { message: obj };
  }

  // Class methods ...
}
```

#### Specific Endpoint Level

At the specific endpoint (method) level, allowing you to configure SerDes for each endpoint individually.

```ts
@Injectable()
export class MyRmqEvents {
  @MessageRoute('text.text')
  @SerDes({
    deserialize: (message: Buffer): any => OtherDeserializer(message),
    serialize: (message: any): Buffer => OtherSerializer(message),
  }) // SerDes is applied only to this method
  handleTextText(obj: any, consumeMessage: ConsumeMessage) {
    return { message: obj };
  }
}
```
