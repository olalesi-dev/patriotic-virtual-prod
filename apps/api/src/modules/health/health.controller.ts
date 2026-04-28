import { Elysia } from 'elysia';
import { setupApp } from '../../setup';

export const healthController = new Elysia({ name: 'health.controller' })
  .use(setupApp)
  .get('/', () => ({
    db: 'ok',
    memory: process.memoryUsage(),
  }));
