export interface IRmqErrorHeaders {
  '-x-error': string;
  '-x-date': string;
  '-x-service': string;
  '-x-host': string;
  '-x-status-code': number;
}
