import { Injectable } from '@nestjs/common';
import { RmqNestjsConnectService } from './rmq-nestjs-connect.service';

@Injectable()
export class RmqService {
  constructor(
    private readonly rmqNestjsConnectService: RmqNestjsConnectService,
  ) {}
}
