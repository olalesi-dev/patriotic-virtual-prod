import { describe, expect, it } from 'bun:test';
import { sendPlainEmail } from './send-plain-email';
import { sendTemplateEmail } from './send-template-email';
import {
  resolveDefaultSenderConfig,
  resolveSenderConfig,
  resolveTemplateId,
} from './templates';
import type { SendGridClient, SendGridPlainEmailClient } from './sendgrid';

const createClient = (): SendGridClient & {
  apiKey?: string;
  message?: unknown;
} => ({
  apiKey: undefined,
  message: undefined,
  setApiKey(apiKey: string) {
    this.apiKey = apiKey;
  },
  async send(message) {
    this.message = message;
    return [{ headers: { 'x-message-id': 'provider-1' }, statusCode: 202 }];
  },
});

const createPlainClient = (): SendGridPlainEmailClient & {
  apiKey?: string;
  message?: unknown;
} => ({
  apiKey: undefined,
  message: undefined,
  setApiKey(apiKey: string) {
    this.apiKey = apiKey;
  },
  async send(message) {
    this.message = message;
    return [{ headers: { 'x-message-id': 'provider-2' }, statusCode: 202 }];
  },
});

describe('template email sending', () => {
  it('resolves template ids from environment values', () => {
    expect(
      resolveTemplateId('patient_welcome', {
        SENDGRID_TEMPLATE_PATIENT_WELCOME: 'd-patient',
      }),
    ).toBe('d-patient');
  });

  it('uses default sender values when env sender values are absent', () => {
    expect(resolveSenderConfig('staff_welcome', {})).toEqual({
      fromEmail: 'hello@patriotictelehealth.com',
      replyTo: 'hello@patriotictelehealth.com',
    });
    expect(resolveDefaultSenderConfig({})).toEqual({
      fromEmail: 'hello@patriotictelehealth.com',
      replyTo: 'hello@patriotictelehealth.com',
    });
  });

  it('throws when the template id is missing', () => {
    expect(() => resolveTemplateId('staff_welcome', {})).toThrow(
      'Missing SendGrid template id',
    );
  });

  it('builds a SendGrid dynamic template message', async () => {
    const client = createClient();
    const result = await sendTemplateEmail(
      {
        templateKey: 'patient_welcome',
        toEmail: 'patient@example.com',
        templateData: { name: 'Patient One' },
        customArgs: { userId: 'user-1' },
      },
      {
        apiKey: 'sg-key',
        client,
        env: {
          SENDGRID_TEMPLATE_PATIENT_WELCOME: 'd-patient',
          SENDGRID_DEFAULT_FROM_EMAIL: 'welcome@example.com',
          SENDGRID_DEFAULT_REPLY_TO_EMAIL: 'support@example.com',
        },
      },
    );

    expect(client.apiKey).toBe('sg-key');
    expect(client.message).toEqual({
      to: 'patient@example.com',
      from: 'welcome@example.com',
      replyTo: 'support@example.com',
      templateId: 'd-patient',
      dynamicTemplateData: { name: 'Patient One' },
      customArgs: { userId: 'user-1' },
    });
    expect(result).toEqual({
      providerMessageId: 'provider-1',
      responseCode: '202',
    });
  });

  it('builds a SendGrid plain transactional message', async () => {
    const client = createPlainClient();
    const result = await sendPlainEmail(
      {
        toEmail: 'patient@example.com',
        subject: 'Your code',
        text: 'Code: 123456',
        html: '<p>Code: 123456</p>',
        customArgs: { category: 'auth' },
      },
      {
        apiKey: 'sg-key',
        client,
        env: {
          SENDGRID_DEFAULT_FROM_EMAIL: 'auth@example.com',
          SENDGRID_DEFAULT_REPLY_TO_EMAIL: 'support@example.com',
        },
      },
    );

    expect(client.apiKey).toBe('sg-key');
    expect(client.message).toEqual({
      to: 'patient@example.com',
      from: 'auth@example.com',
      replyTo: 'support@example.com',
      subject: 'Your code',
      text: 'Code: 123456',
      html: '<p>Code: 123456</p>',
      customArgs: { category: 'auth' },
    });
    expect(result).toEqual({
      providerMessageId: 'provider-2',
      responseCode: '202',
    });
  });
});
