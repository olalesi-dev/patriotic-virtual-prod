import { describe, expect, it } from 'bun:test';
import { app } from '../../index';

describe('MFA factor controller', () => {
  it('requires a signed-in session before returning factor metadata', async () => {
    const response = await app.handle(
      new Request('http://localhost/api/auth/mfa/factors'),
    );
    const body = await response.json();

    expect(response.status).toBe(401);
    expect(body.error).toBe('Unauthorized');
  });
});
