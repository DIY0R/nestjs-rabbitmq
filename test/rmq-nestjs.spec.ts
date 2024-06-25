import { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { RmqServieController } from './mocks/rmq.controller';
import { RmqNestjsModule, RmqService } from '../lib';
import { ConnectionMockModule } from './mocks/rmq-nestjs.module';

describe('RMQe2e', () => {
  let api: INestApplication;
  let rmqServieController: RmqServieController;
  let rmqService: RmqService;
  beforeAll(async () => {
    const apiModule = await Test.createTestingModule({
      imports: [
        RmqNestjsModule.forRoot({
          username: 'for-test',
          password: 'for-test',
          hostname: 'localhost',
          port: 5672,
          virtualHost: '/',
        }),
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

  describe('rpc', () => {
    it('check connection', async () => {
      const isConnected = rmqService.healthCheck();
      expect(isConnected).toBe(true);
    });
    it('successful send()', async () => {
      const obj = { time: '001', fulled: 12 };
      const { message } = await rmqServieController.sendHi(obj);
      expect(message).toEqual(obj);
    });
    it('filed send()', async () => {
      const obj = { time: '001', fulled: 12 };
      const { message } = await rmqServieController.sendHi(obj);
      expect(message).not.toEqual({});
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
