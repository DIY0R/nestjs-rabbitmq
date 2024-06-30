import { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { RmqServieController } from './mocks/rmq.controller';
import { RmqNestjsModule, RmqService } from '../lib';
import { ConnectionMockModule } from './mocks/rmq-nestjs.module';
import { ERROR_NO_ROUTE, TIMEOUT_ERROR } from '../lib/constants';

describe('RMQe2e', () => {
  let api: INestApplication;
  let rmqServieController: RmqServieController;
  let rmqService: RmqService;
  beforeAll(async () => {
    const apiModule = await Test.createTestingModule({
      imports: [
        RmqNestjsModule.forRoot(
          {
            username: 'for-test',
            password: 'for-test',
            hostname: 'localhost',
            port: 5672,
            virtualHost: '/',
          },
          {
            globalBroker: {
              replyTo: {
                queue: 'RmqNestj1111sModuleGlobalQueue',
                options: { exclusive: true },
                consumOptions: { noAck: false },
              },
              messageTimeout: 50000,
              serviceName: 'global srvice',
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
    console.warn = jest.fn();
    console.log = jest.fn();
  });
  test('check connection', async () => {
    const isConnected = rmqService.healthCheck();
    expect(isConnected).toBe(true);
  });
  describe('rpc', () => {
    it('successful global send()', async () => {
      const obj = { time: '001', fulled: 12 };
      const { message } = await rmqServieController.sendGlobalRoute(obj);
      expect(message).toEqual(obj);
    });
    it('successful global notify()', async () => {
      const obj = { time: '001', fulled: 12 };
      const response = rmqServieController.sendNotify(obj);
      expect(response).toEqual({ status: 'ok' });
    });
    it('successful send()', async () => {
      const obj = { time: '001', fulled: 12 };
      const topic = 'text.text';
      const { message } = await rmqServieController.sendMessage(obj, topic);
      expect(message).toEqual(obj);
    });
    it('cant find route', async () => {
      const obj = { time: 1 };
      const message = await rmqServieController.sendNonRoute(obj);
      expect(message).toEqual({ error: ERROR_NO_ROUTE });
    });
    it('send topic patern #1 "*"', async () => {
      const obj = { time: 1 };
      const topic = 'message.text.rpc';
      const { message } = await rmqServieController.sendMessage(obj, topic);
      expect(message).toEqual(obj);
    });
    it('send topic patern #2 "#"', async () => {
      const obj = { time: 1 };
      const topic = 'rpc.text.text';
      const { message } = await rmqServieController.sendMessage(obj, topic);
      expect(message).toEqual(obj);
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
