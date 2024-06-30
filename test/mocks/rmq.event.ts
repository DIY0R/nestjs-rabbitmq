import { Injectable, Logger } from '@nestjs/common';
import { MessageRoute } from '../../lib/decorators/rmq-message.decorator';

@Injectable()
export class RmqEvents {
  @MessageRoute('text.text')
  recived(obj: any) {
    return { message: obj };
  }
  @MessageRoute('*.*.rpc')
  recivedTopic(obj: any) {
    return { message: obj };
  }
  @MessageRoute('rpc.#')
  recivedTopicPattern(obj: any) {
    return { message: obj };
  }
  @MessageRoute('rpc.notify')
  recivedTopicNotify(obj: any) {
    Logger.log(obj);
  }
  @MessageRoute('rpc.global')
  recivedGlobal(obj: any) {
    return { message: obj };
  }
}
