import { describe, expect, it } from 'bun:test';
import { Elysia, t } from 'elysia';
import { setupApp } from './setup';
import { BadRequestException } from './utils/errors';

describe('Setup App', () => {
  it('should successfully instantiate without crashing', () => {
    expect(setupApp).toBeDefined();
    // Ensures that the returned object is an Elysia instance.
    expect(setupApp.server).toBeNull();
  });

  describe('Error Handling', () => {
    it('should format validation errors', async () => {
      const app = new Elysia().use(setupApp).post('/', ({ body }) => body, {
        body: t.Object({ name: t.String() }),
      });

      const res = await app.handle(
        new Request('http://localhost/', {
          body: JSON.stringify({ wrong: 'type' }),
          headers: { 'Content-Type': 'application/json' },
          method: 'POST',
        }),
      );

      expect(res.status).toBe(422);
      const json = await res.json();
      expect(json.success).toBe(false);
      expect(json.error).toBeDefined();
      expect(json.code).toBe(422);
    });

    it('should format custom HTTP exceptions', async () => {
      const app = new Elysia().use(setupApp).get('/', () => {
        throw new BadRequestException('custom error');
      });

      const res = await app.handle(new Request('http://localhost/'));
      expect(res.status).toBe(400);
      const json = await res.json();
      expect(json.success).toBe(false);
      expect(json.error).toBe('custom error');
      expect(json.code).toBe(400);
    });

    it('should format unexpected errors', async () => {
      const app = new Elysia().use(setupApp).get('/', () => {
        throw new Error('unexpected error');
      });

      const res = await app.handle(new Request('http://localhost/'));
      expect(res.status).toBe(500);
      const json = await res.json();
      expect(json.success).toBe(false);
      expect(json.error).toBe('Internal Server Error');
      expect(json.code).toBe(500);
    });
  });

  describe('Response Mapping', () => {
    it('should return successful responses directly', async () => {
      const app = new Elysia().use(setupApp).get('/', () => ({ myData: 123 }));

      const res = await app.handle(new Request('http://localhost/'));
      expect(res.status).toBe(200);
      const json = await res.json();
      expect(json).toEqual({ myData: 123 });
    });

    it('should not wrap responses even if they look like an envelope', async () => {
      const app = new Elysia()
        .use(setupApp)
        .get('/', () => ({ data: { myData: 123 }, success: true }));

      const res = await app.handle(new Request('http://localhost/'));
      expect(res.status).toBe(200);
      const json = await res.json();
      expect(json).toEqual({ data: { myData: 123 }, success: true });
    });

    it('should not wrap Response objects directly', async () => {
      const app = new Elysia()
        .use(setupApp)
        .get('/', () => new Response('Plain text'));

      const res = await app.handle(new Request('http://localhost/'));
      expect(res.status).toBe(200);
      const text = await res.text();
      expect(text).toBe('Plain text');
    });
  });

  describe('CORS Plugin', () => {
    it('should return CORS headers on OPTIONS request', async () => {
      const app = new Elysia().use(setupApp).get('/', () => 'ok');
      const res = await app.handle(
        new Request('http://localhost/', {
          method: 'OPTIONS',
          headers: {
            Origin: 'http://localhost:52305',
            'Access-Control-Request-Method': 'GET',
          },
        }),
      );
      expect(res.headers.get('access-control-allow-origin')).toBe(
        'http://localhost:52305',
      );
      expect(res.headers.get('access-control-allow-credentials')).toBe('true');
    });
  });
});
