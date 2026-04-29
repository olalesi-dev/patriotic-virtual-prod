import { Elysia } from 'elysia';

export const compression = () =>
  new Elysia({ name: 'custom-compression' }).onAfterHandle(
    { as: 'global' },
    ({ request, response, set }) => {
      const acceptEncoding = request.headers.get('accept-encoding') || '';

      // If no response or already compressed, do nothing
      if (!response || set.headers['content-encoding']) {
        return;
      }

      let payload: string | Uint8Array;
      if (typeof response === 'string') {
        payload = response;
      } else if (typeof response === 'object') {
        payload = JSON.stringify(response);
        set.headers['content-type'] = 'application/json';
      } else {
        return; // Unhandled type
      }

      if (acceptEncoding.includes('gzip')) {
        set.headers['content-encoding'] = 'gzip';
        return Bun.gzipSync(new TextEncoder().encode(payload as string));
      }

      if (acceptEncoding.includes('deflate')) {
        set.headers['content-encoding'] = 'deflate';
        return Bun.deflateSync(new TextEncoder().encode(payload as string));
      }
    },
  );
