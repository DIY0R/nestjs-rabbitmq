import { Test, TestingModule } from '@nestjs/testing';
import { RmqNestjsService } from './rmq-nestjs.service';

describe('RmqNestjsService', () => {
  let service: RmqNestjsService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [RmqNestjsService],
    }).compile();

    service = module.get<RmqNestjsService>(RmqNestjsService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
