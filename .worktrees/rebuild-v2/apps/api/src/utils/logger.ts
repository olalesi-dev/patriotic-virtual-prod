import type { LoggerOptions } from 'pino';

// Force simple logging for container/load-test environments
export const loggerConfig: LoggerOptions = {
  level: 'info',
};
