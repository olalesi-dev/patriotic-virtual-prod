import { Elysia } from 'elysia';
import { auth } from '@workspace/auth/auth';

export const authController = new Elysia({ name: 'auth.controller' }).all(
  '/api/auth/*',
  ({ request }) => auth.handler(request),
);
