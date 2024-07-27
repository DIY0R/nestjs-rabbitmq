import { Injectable } from '@nestjs/common';
import { Message, MessagePropertyHeaders } from 'amqplib';
import { IRmqErrorHeaders } from 'lib/interfaces';
import { hostname } from 'os';
@Injectable()
export class RmqErrorService {
  public buildError(error: Error | RMQError) {
    if (!error) return null;

    let errorHeaders = {};
    errorHeaders['-x-error'] = error.message;
    errorHeaders['-x-host'] = hostname();
    errorHeaders['-x-service'] = (error as RMQError).service;
    if (this.isRMQError(error)) {
      errorHeaders = {
        ...errorHeaders,
        '-x-date': (error as RMQError).date,
        '-x-status-code': (error as RMQError).status,
      };
    }
    return errorHeaders;
  }

  public errorHandler(msg: Message): any {
    const { headers } = msg.properties;
    return RMQErrorHandler.handle(headers);
  }

  private isRMQError(error: Error | RMQError): boolean {
    return (error as RMQError).status !== undefined;
  }
}
export class RMQError extends Error {
  message: string;
  service?: string;
  status?: number;
  date?: string;
  host?: string;
  constructor(
    message: string,
    service?: string,
    status?: number,
    host?: string,
    date?: string,
  ) {
    super();
    Object.setPrototypeOf(this, new.target.prototype);
    this.message = message;
    this.date = date;
    this.status = status;
    this.host = host;
    this.service = service;
  }
}

export class RMQErrorHandler {
  public static handle(
    headers: IRmqErrorHeaders | MessagePropertyHeaders,
  ): Error | RMQError {
    return new RMQError(
      headers['-x-error'],
      headers['-x-service'],
      headers['-x-status-code'],
      headers['-x-host'],
      headers['-x-date'],
    );
  }
}
