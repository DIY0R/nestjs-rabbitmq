import { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { RmqServieController } from './mocks/rmq.controller';
import { RmqModule, RmqService, TypeChannel, RMQError } from '../lib';
import { ConnectionMockModule } from './mocks/rmq-nestjs.module';
import { hostname } from 'node:os';
import { MyGlobalRMQErrorHandler } from './mocks/error.handlers';
import { MyClass } from './mocks/dto/myClass.dto';

describe('RMQe2e', () => {
  let api: INestApplication;
  let rmqServieController: RmqServieController;
  let rmqService: RmqService;

  beforeAll(async () => {
    const apiModule = await Test.createTestingModule({
      imports: [
        RmqModule.forRootAsync({
          useFactory: async () => ({
            connectOptions: {
              username: 'for-test',
              password: 'for-test',
              hostname: 'localhost',
              port: 5672,
              vhost: 'local',
              protocol: 'amqp',
            },
            extendedOptions: {
              typeChannel: TypeChannel.CONFIRM_CHANNEL,
              globalBroker: {
                replyTo: {
                  queue: '',
                  options: { exclusive: true },
                  consumeOptions: { noAck: true },
                  errorHandler: MyGlobalRMQErrorHandler,
                },
                messageTimeout: 50000,
                serviceName: 'global service',
                serDes: {
                  deserialize: (message: Buffer): any =>
                    JSON.parse(message.toString()),
                  serialize: (message: any): Buffer =>
                    Buffer.from(JSON.stringify(message)),
                },
              },
              socketOptions: {
                clientProperties: { connection_name: 'myFriendlyName' },
              },
            },
          }),
          inject: [],
        }),
        ConnectionMockModule,
      ],
    }).compile();

    api = apiModule.createNestApplication();
    await api.init();

    rmqServieController =
      apiModule.get<RmqServieController>(RmqServieController);
    rmqService = apiModule.get<RmqService>(RmqService);
  });

  test('check connection', async () => {
    const isConnected = rmqService.healthCheck();
    expect(isConnected).toBe(true);
  });

  describe('notify', () => {
    it('successful global notify()', async () => {
      const obj = { time: '001', fulled: 12 };
      const response = await rmqServieController.sendNotify(obj);
      expect(response).toEqual({ status: 'ok' });
    });

    it('successful service notify()', async () => {
      const obj = { time: '001', fulled: 12 };
      const response = await rmqServieController.sendNotifyService(obj);
      expect(response).toEqual({ status: 'ok' });
    });
  });

  describe('rpc exchange', () => {
    it('successful global send()', async () => {
      const obj = { time: '001', fulled: 12 };
      const { message } = await rmqServieController.sendGlobal(
        obj,
        'global.rpc',
      );
      expect(message).toEqual(obj);
    });

    it('successful send()', async () => {
      const obj = { obj: 1 };
      const topic = 'text.text';
      const { message } = await rmqServieController.sendMessage(obj, topic);
      expect(message).toEqual(obj);
    });

    it('successful send() but return nothing', async () => {
      const obj = { obj: 1 };
      const topic = 'text.nothing';
      const message = await rmqServieController.sendMessage(obj, topic);
      expect(message).toEqual({});
    });

    it('send topic pattern #1 "*"', async () => {
      const obj = { time: 1 };
      const topic = 'message.rpc.tsp';
      const { message } = await rmqServieController.sendMessage(obj, topic);
      expect(message).toEqual(obj);
    });

    it('send topic pattern #2 "#"', async () => {
      const obj = { time: 1 };
      const topic = 'rpc.text.text';
      const { message } = await rmqServieController.sendMessage(obj, topic);
      expect(message).toEqual(obj);
    });

    it('send mix topic pattern #3 "*#"', async () => {
      const obj = { time: 1 };
      const topic = 'text.rpc.mix.pool.too';
      const { message } = await rmqServieController.sendMessage(obj, topic);
      expect(message).toEqual(obj);
    });

    it('error route with Error', async () => {
      try {
        const obj = { time: 1 };
        const topic = 'error.error';
        await rmqServieController.sendMessage(obj, topic);
      } catch (error) {
        expect((error as RMQError).host).toBe(hostname());
      }
    });

    it('error route with rmqError', async () => {
      try {
        const obj = { time: 1 };
        const topic = 'error.error.rmq';
        await rmqServieController.sendMessage(obj, topic);
      } catch (error) {
        expect((error as RMQError).status).toBe(302);
        expect((error as RMQError).date).toBe(new Date().getMonth().toString());
      }
    });

    it('error route with rmqError global', async () => {
      try {
        const obj = { time: 1 };
        const topic = 'error.error.rmq';
        await rmqServieController.sendGlobal(obj, topic);
      } catch (error) {
        expect((error as RMQError).status).toBe(302);
        expect((error as RMQError).date).toBe(new Date().getDate().toString());
      }
    });
  });

  describe('send message to queue', () => {
    it('send to Queue', async () => {
      const obj = { aq: 1121 };
      const status = await rmqServieController.sendToQueue('test-for', obj);
      expect(status).toBeTruthy();
    });
  });

  describe('send message with Providers', () => {
    it('send with interceptors', async () => {
      const obj = { arrayInterceptor: [0] };
      const topic = 'text.interceptor';
      const message = await rmqServieController.sendMessageWithProvider<{
        arrayInterceptor: number[];
      }>(obj, topic);
      expect(message.arrayInterceptor).toEqual([0, 1, 2, 3, 4, 5, 6]);
    });

    it('send with middleware', async () => {
      const obj = { arrayMiddleware: [0] };
      const topic = 'text.middleware';
      const message = await rmqServieController.sendMessageWithProvider<{
        arrayMiddleware: number[];
      }>(obj, topic);
      expect(message.arrayMiddleware).toEqual([0, 1, 2, 3]);
    });

    it('send with middleware that returned', async () => {
      const obj = {};
      const topic = 'text.middleware.return';
      const message = await rmqServieController.sendMessageWithProvider<{
        return: boolean;
      }>(obj, topic);
      expect(message).toEqual({ return: true });
    });
  });

  describe('validation messages', () => {
    it('send valid message', async () => {
      const topic = 'message.valid';
      const objMessage: MyClass = {
        age: 20,
        name: 'Diy0r',
      };
      const { message } = await rmqServieController.sendMessage(
        objMessage,
        topic,
      );
      expect(message).toEqual(message);
    });

    it('send invalid message', async () => {
      try {
        const topic = 'message.valid';
        const objMessage = {
          age: '20',
          name: 'FooLii1p',
        };
        await rmqServieController.sendMessage(objMessage, topic);
      } catch (error) {
        expect(error.message).toEqual(
          'The name must be less than 5; age must be an integer number',
        );
      }
    });
  });

  afterAll(async () => {
    await delay(500);
    await api.close();
  });
});

async function delay(time: number): Promise<void> {
  return new Promise((resolve) => {
    setTimeout(() => {
      resolve();
    }, time);
  });
}
