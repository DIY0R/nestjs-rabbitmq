import { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { RmqEvents } from './mocks/rmq.event.spec';
import { RmqServieController } from './mocks/rmq.controller.spec';
import { RmqNestjsModule, RmqService } from 'lib';
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
          port: 15672,
          virtualHost: '/',
        }),
      ],
      controllers: [RmqServieController, ConnectionMockModule],
    }).compile();
    api = apiModule.createNestApplication();
    await api.init();

    rmqServieController =
      apiModule.get<RmqServieController>(RmqServieController);
    console.warn = jest.fn();
    console.log = jest.fn();
  });

  describe('rpc', () => {});

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