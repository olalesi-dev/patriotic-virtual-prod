import { Elysia } from 'elysia';
import { logger } from '@bogeychan/elysia-logger';
import { requestID } from 'elysia-requestid';
import { ip } from 'elysia-ip';
import { helmet } from 'elysia-helmet';
import { rateLimit } from 'elysia-rate-limit';
import { elysiaXSS as xss } from 'elysia-xss';
import { cors } from '@elysiajs/cors';
import { env } from '@workspace/env';
import { loggerConfig } from './utils/logger';
import { compression } from './plugins/compression';
import { circuitBreakerPlugin } from './plugins/circuit-breaker';
import { authMacro } from './modules/auth/macro';
import { auditMacro } from './modules/audit/macro';

export const setupApp = new Elysia({ name: 'setup' })
  .use(logger(loggerConfig))
  .use(requestID())
  .use(ip())
  .use(helmet())
  .use(
    cors({
      origin: env.CORS_ORIGIN
        ? env.CORS_ORIGIN.split(',')
        : ['http://localhost:52305'],
      credentials: true,
      allowedHeaders: ['Content-Type', 'Authorization'],
    }),
  )
  .use(rateLimit())
  .use(compression())
  .use(circuitBreakerPlugin())
  .use(xss())
  .use(authMacro)
  .use(auditMacro)
  .onError({ as: 'global' }, ({ code, error, log, set, request }) => {
    let statusCode = 500;
    let message = 'Internal Server Error';

    if (code === 'VALIDATION') {
      statusCode = 422;
      ({ message } = error);
    } else if (error && typeof error === 'object') {
      const errObj = error as Record<string, unknown>;
      if ('status' in errObj && typeof errObj.status === 'number') {
        statusCode = errObj.status;
        message = (error as Error).message || message;
      } else if (
        'statusCode' in errObj &&
        typeof errObj.statusCode === 'number'
      ) {
        ({ statusCode } = errObj);
        message = (error as Error).message || message;
      }
    }

    if (code === 'NOT_FOUND') {
      statusCode = 404;
      message = 'Route not found';
    }

    if (log) {
      log.error(
        { err: error, requestId: request.headers.get('x-request-id') },
        message,
      );
    }

    return Response.json(
      {
        code: statusCode,
        error: message,
        success: false,
      },
      { status: statusCode },
    );
  })
  .onAfterHandle({ as: 'global' }, ({ response }) => {
    if (response instanceof Response) {
      return response;
    }
    if (response && typeof response === 'object' && 'success' in response) {
      return response;
    }

    return Response.json({
      data: response,
      success: true,
    });
  });
