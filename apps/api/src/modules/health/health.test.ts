import { describe, expect, it } from 'bun:test';
import { app } from '../../index';

describe('Health Controller', () => {
  it('should return health status with HTTP 200', async () => {
    const request = new Request('http://localhost/api/health/');
    const response = await app.handle(request);

    expect(response.status).toBe(200);

    const body = await response.json();
    expect(body.success).toBe(true);
    expect(body.data).toBeDefined();
    expect(body.data.db).toBe('ok');
    expect(body.data.memory).toBeDefined();
  });
});
