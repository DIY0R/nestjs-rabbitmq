import { Injectable } from '@nestjs/common';
import { MessageRoute } from '../../lib/decorators/rmq-message.decorator';

@Injectable()
export class RmqEvents {
  @MessageRoute('hi')
  hi() {
    return { message: 'hi' };
  }
}
