import { describe, expect, it } from 'bun:test';
import {
  buildWelcomeTemplateData,
  selectWelcomeTemplate,
  sendWelcomeEmailForCreatedUser,
} from './email-hooks';

describe('auth email hooks', () => {
  it('uses staff welcome templates for admin-style roles', () => {
    expect(selectWelcomeTemplate({ role: 'admin' })).toBe('staff_welcome');
    expect(selectWelcomeTemplate({ role: 'provider' })).toBe('staff_welcome');
  });

  it('uses patient welcome templates by default', () => {
    expect(selectWelcomeTemplate({})).toBe('patient_welcome');
  });

  it('builds welcome template data from the created user', () => {
    expect(
      buildWelcomeTemplateData({
        email: 'patient@example.com',
        name: 'Patient One',
      }),
    ).toMatchObject({
      email: 'patient@example.com',
      name: 'Patient One',
      supportEmail: 'support@patriotictelehealth.com',
    });
  });

  it('sends a welcome email for created users', async () => {
    const calls: unknown[] = [];
    const result = await sendWelcomeEmailForCreatedUser(
      {
        id: 'user-1',
        email: 'patient@example.com',
        name: 'Patient One',
      },
      {
        sender: async (input) => {
          calls.push(input);
          return { providerMessageId: 'provider-1', responseCode: '202' };
        },
      },
    );

    expect(result).toEqual({
      sent: true,
      templateKey: 'patient_welcome',
      providerMessageId: 'provider-1',
    });
    expect(calls).toHaveLength(1);
    expect(calls[0]).toMatchObject({
      templateKey: 'patient_welcome',
      toEmail: 'patient@example.com',
      customArgs: { userId: 'user-1' },
    });
  });

  it('does not throw by default when email sending fails', async () => {
    const result = await sendWelcomeEmailForCreatedUser(
      {
        id: 'user-1',
        email: 'patient@example.com',
      },
      {
        sender: async () => {
          throw new Error('SendGrid is unavailable.');
        },
      },
    );

    expect(result).toMatchObject({
      sent: false,
      templateKey: 'patient_welcome',
      error: 'SendGrid is unavailable.',
    });
  });
});
