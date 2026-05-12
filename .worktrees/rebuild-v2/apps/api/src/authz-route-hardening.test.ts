import { describe, expect, it } from 'bun:test';
import { app } from './index';

const postJson = (path: string, body: unknown) =>
  app.handle(
    new Request(`http://localhost${path}`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(body),
    }),
  );

describe('authorization hardening', () => {
  it('does not expose internal notification enqueue routes without a session', async () => {
    const response = await postJson('/api/notifications/notify', {
      topicKey: 'SECURITY_TEST',
      entityId: 'entity-1',
      recipientIds: ['user-1'],
      templateData: {},
    });

    expect(response.status).toBe(401);
  });

  it('does not create delegated access sessions without a signed-in admin', async () => {
    const response = await postJson('/api/admin/delegated-access/sessions', {
      actorUserId: 'user-1',
      targetProviderId: 'provider-1',
      reason: 'Need temporary clinical coverage.',
      scopes: ['dosespot:on-behalf-of'],
    });

    expect(response.status).toBe(401);
  });

  it('does not mark step-up authentication without a session', async () => {
    const response = await postJson('/api/auth/session/step-up/password', {
      password: 'secret',
    });

    expect(response.status).toBe(401);
  });
});
