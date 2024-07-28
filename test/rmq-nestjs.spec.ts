import { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { RmqServieController } from './mocks/rmq.controller';
import { RmqModule, RmqService, TypeChannel } from '../lib';
import { ConnectionMockModule } from './mocks/rmq-nestjs.module';
import { RETURN_NOTHING } from '../lib/constants';
import { hostname } from 'node:os';
import { RMQError } from 'lib/common';

describe('RMQe2e', () => {
  let api: INestApplication;
  let rmqServieController: RmqServieController;
  let rmqService: RmqService;
  beforeAll(async () => {
    const apiModule = await Test.createTestingModule({
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
          {
            typeChannel: TypeChannel.CONFIRM_CHANNEL,
            globalBroker: {
              replyTo: {
                queue: '',
                options: { exclusive: true },
                consumOptions: { noAck: true },
              },
              messageTimeout: 50000,
              serviceName: 'global srvice',
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
        ),
        ConnectionMockModule,
      ],
    }).compile();
    api = apiModule.createNestApplication();
    await api.init();

    rmqServieController =
      apiModule.get<RmqServieController>(RmqServieController);
    rmqService = apiModule.get(RmqService);
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

    it('send topic patern #1 "*"', async () => {
      const obj = { time: 1 };
      const topic = 'message.rpc.tsp';
      const { message } = await rmqServieController.sendMessage(obj, topic);
      expect(message).toEqual(obj);
    });
    it('send topic patern #2 "#"', async () => {
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
    it('error route', async () => {
      try {
        const obj = { time: 1 };
        const topic = 'error.error';
        await rmqServieController.sendMessage(obj, topic);
      } catch (error) {
        expect(error.host).toBe(hostname());
      }
    });
    it('error route with rmqError', async () => {
      try {
        const obj = { time: 1 };
        const topic = 'error.error.rmq';
        await rmqServieController.sendMessage(obj, topic);
      } catch (error) {
        expect((error as RMQError).status).toBe(302);
      }
    });
    it('error with global send();', async () => {
      try {
        const obj = { time: 1 };
        const topic = 'error.error.rmq';
        await rmqServieController.sendGlobal(obj, topic);
      } catch (error) {
        expect((error as RMQError).status).toBe(302);
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
    it('send with middleware that returned ', async () => {
      const obj = {};
      const topic = 'text.middleware.return';
      const message = await rmqServieController.sendMessageWithProvider<{
        return: boolean;
      }>(obj, topic);
      expect(message).toEqual({ return: true });
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
