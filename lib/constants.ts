import { INTERCEPTORS_METADATA } from '@nestjs/common/constants';

export const RMQ_OPTIONS = 'RMQ_Options';
export const RMQ_BROKER_OPTIONS = 'RMQ_BROKER_OPTIONS';
export const RMQ_MESSAGE_META_TAG = 'RMQ_MESSAGE_META_TAG';
export const RMQ_ROUTES_TRANSFORM = 'RMQ_ROUTES_TRANSFORM';
export const GET_INTERCEPTORS = 'GET_INTERCEPTORS';
export const TARGET_MODULE = 'TARGET_MODULE';
export const SER_DAS_KEY = 'SER_DAS_KEY';
export const RMQ_VALIDATE = 'RMQ_VALIDATE';
export const SERDES = 'SERDES';
export const INTERCEPTORS = 'INTERCEPTORS';
export const MIDDLEWARES = 'MIDDLEWARES';
export const INTERCEPTOR_CUSTOM_METADATA = INTERCEPTORS_METADATA;
export const MIDDLEWARES_METADATA = 'MIDDLEWARE_KEY';
export const MESSAGE_ROUTER = 'MessageRouterExplorer';
export const MODULE_TOKEN = 'MODULE_UNIQ_TOKEN';

export const CLOSE_EVENT = 'close';
export const CONNECT_ERROR = 'error';
export const CONNECT_BLOCKED = 'blocked';
export const INITIALIZATION_STEP_DELAY = 400;
export const TIMEOUT_INIT_INTERCEPTORS = 300;
export const DEFAULT_TIMEOUT = 40000;
export const RECONNECTION_INTERVAL = 5000;
export const NON_ROUTE = 'There is no that route';

export const INDICATE_REPLY_QUEUE = 'Please indicate `replyToQueue`';
export const INDICATE_REPLY_QUEUE_GLOBAL = 'Please indicate `replyToQueue` in globalBroker';
export const TIMEOUT_ERROR = 'Response timeout error';
export const RECEIVED_MESSAGE_ERROR = 'Received a message but with an error';
export const ERROR_RMQ_SERVICE = 'RMQ service error';
export const NACKED = 'Negative acknowledgment';
export const RETURN_NOTHING = 'Route returned nothing';
export const NON_DECLARED_ROUTE = 'No Message Route has been declared in the Module';

export const ERROR_NO_ROUTE = "Requested service doesn't have a MessageRoute with this path";
export const EMPTY_OBJECT_MESSAGE = 'Received empty object message content';
export const MESSAGE_NON = 'Send an existing message';
export const CLOSE_MESSAGE = 'Disconnected from RMQ. Trying to reconnect';
export const CONNECT_FAILED_MESSAGE = 'Failed to connect to RMQ';
export const WRONG_CREDENTIALS_MESSAGE = 'Wrong credentials for RMQ';
export const CONNECT_BLOCKED_MESSAGE = 'Connection blocked';
export const SUCCESSFUL_CONNECT = 'Successfully connected to RabbitMQ';
export const ROOT_MODULE_DECLARED = 'Root RmqNestjsModule already declared!';
