import { Injectable } from '@nestjs/common';
import { MessageRoute } from '../../lib/decorators/rmq-message.decorator';

@Injectable()
export class RmqEvents {
  @MessageRoute('text.text')
  recived(obj: any) {
    return { message: obj };
  }
}
