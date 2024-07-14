import { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { RmqServieController } from './mocks/rmq.controller';
import { RmqModule, RmqService, TypeChanel } from '../lib';
import { ConnectionMockModule } from './mocks/rmq-nestjs.module';
import { RETURN_NOTHING } from '../lib/constants';

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
            typeChanel: TypeChanel.CONFIRM_CHANEL,
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
                serializer: (message: any): Buffer =>
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
      const { message } = await rmqServieController.sendGlobalRoute(obj);
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
      expect(message).toEqual({ info: RETURN_NOTHING });
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
  });
  describe('send message to queue', () => {
    it('send to Queue', () => {
      const obj = { aq: 1121 };
      const status = rmqServieController.sendToQueue('test-for', obj);
      expect(status).toBeTruthy();
    });
  });

  describe('send message with interceptors', () => {
    it('send with interceptors', async () => {
      const obj = { array: [0] };
      const topic = 'text.interceptor';
      const message = await rmqServieController.sendMessageWithInterceptor(
        obj,
        topic,
      );
      expect(message.array).toEqual([0, 1, 2, 3, 4, 5, 6]);
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
