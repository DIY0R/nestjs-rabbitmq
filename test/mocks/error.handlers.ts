import { MessagePropertyHeaders } from 'amqplib';
import { IRmqErrorHeaders, RMQError } from '../../lib';

export class MyRMQErrorHandler {
  public static handle(headers: IRmqErrorHeaders | MessagePropertyHeaders): Error | RMQError {
    return new RMQError(
      headers['-x-error'],
      headers['-x-service'],
      headers['-x-status-code'],
      headers['-x-host'],
      new Date().getMonth().toString(),
    );
  }
}
export class MyGlobalRMQErrorHandler {
  public static handle(headers: IRmqErrorHeaders | MessagePropertyHeaders): Error | RMQError {
    return new RMQError(
      headers['-x-error'],
      headers['-x-service'],
      headers['-x-status-code'],
      headers['-x-host'],
      new Date().getDate().toString(),
    );
  }
}
