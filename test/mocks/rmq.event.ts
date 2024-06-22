import { Injectable } from '@nestjs/common';
import { RMQEvent } from '../../lib/decorators/rmq-message.decorator';

@Injectable()
export class RmqEvents {
  @RMQEvent('hi')
  hi() {
    return { message: 'hi' };
  }
}
