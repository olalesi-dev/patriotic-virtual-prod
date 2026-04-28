import type { LoggerOptions } from 'pino';

const isDev = process.env.NODE_ENV === 'development';

export const loggerConfig: LoggerOptions = isDev
  ? {
      transport: {
        options: {
          colorize: true,
        },
        target: 'pino-pretty',
      },
    }
  : {
      transport: {
        options: {
          extension: '.log',
          file: 'logs/api',
          frequency: 'daily',
          mkdir: true,
          size: '10m',
        },
        target: 'pino-roll',
      },
    };
