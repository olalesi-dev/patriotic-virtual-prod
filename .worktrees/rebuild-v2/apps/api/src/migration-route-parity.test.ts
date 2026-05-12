import { describe, expect, it } from 'bun:test';
import { app } from './index';

const routeKeys = new Set(
  app.routes.map((route) => `${route.method} ${route.path}`),
);

const expectRoute = (method: string, path: string) => {
  expect(routeKeys.has(`${method} ${path}`)).toBe(true);
};

describe('Migrated backend route parity', () => {
  it('exposes the canonical versioned phone verification and Telnyx routes', () => {
    expectRoute('POST', '/api/v1/phone-verification/request');
    expectRoute('POST', '/api/v1/phone-verification/verify');
    expectRoute('POST', '/api/v1/telnyx/webhook');
  });

  it('keeps the appointment and telehealth routes used by notification flows', () => {
    expectRoute('GET', '/api/clinical/appointments/');
    expectRoute('GET', '/api/clinical/appointments/:id');
    expectRoute('PATCH', '/api/clinical/appointments/:id');
    expectRoute('PATCH', '/api/dashboard/appointments/:id');
    expectRoute('POST', '/api/profile/me/revoke-sessions');
    expectRoute('POST', '/api/admin/users/:id/revoke-sessions');
    expectRoute('POST', '/api/admin/users/:id/disable');
    expectRoute('POST', '/api/admin/users/:id/enable');
    expectRoute('POST', '/api/admin/users/:id/mfa/reset');
    expectRoute('GET', '/api/admin/users/');
    expectRoute('GET', '/api/admin/users/:id');
    expectRoute('GET', '/api/admin/users/:id/sessions');
    expectRoute('GET', '/api/admin/sessions/');
    expectRoute('GET', '/api/admin/audit/');
    expectRoute('GET', '/api/admin/audit/export');
    expectRoute('GET', '/api/auth/mfa/factors');
    expectRoute('POST', '/api/admin/emergency-access/grants');
    expectRoute('POST', '/api/admin/delegated-access/sessions');
    expectRoute('GET', '/api/delegated-access/current');
    expectRoute('POST', '/api/delegated-access/:id/end');
    expectRoute('POST', '/api/auth/session/step-up/password');
    expectRoute('GET', '/api/emergency-access/current');
    expectRoute('POST', '/api/emergency-access/activate');
    expectRoute('POST', '/api/emergency-access/:id/end');
    expectRoute('GET', '/api/admin/roles/');
    expectRoute('PUT', '/api/admin/roles/:id/permissions');
    expectRoute('POST', '/api/telehealth/appointments/:id/generate-link');
    expectRoute('POST', '/api/telehealth/appointments/:id/complete');
    expectRoute('GET', '/api/messages/');
    expectRoute('GET', '/api/messages/sync');
    expectRoute('GET', '/api/messages/:id');
    expectRoute('PATCH', '/api/messages/:id/read');
    expectRoute('POST', '/api/messages/encrypted');
    expectRoute('GET', '/api/documents/encrypted');
    expectRoute('GET', '/api/documents/encrypted/:id');
    expectRoute('POST', '/api/documents/encrypted');
    expectRoute('PATCH', '/api/documents/encrypted/:id/complete');
  });

  it('exposes every legacy DoseSpot route under the canonical versioned prefix', () => {
    const versionedDoseSpotRoutes = [
      ['GET', '/api/v1/dosespot/sso-url'],
      ['GET', '/api/v1/dosespot/notification-count'],
      ['POST', '/api/v1/dosespot/push-notifications'],
      ['POST', '/api/v1/dosespot/push-notifications/process'],
      ['GET', '/api/v1/dosespot/push-notifications/health'],
      ['GET', '/api/v1/dosespot/push-notifications/validation'],
      ['POST', '/api/v1/dosespot/screen-demo/validation'],
      ['GET', '/api/v1/dosespot/clinicians/readiness'],
      ['POST', '/api/v1/dosespot/clinicians/sync'],
      ['POST', '/api/v1/dosespot/clinicians/internal-sync'],
      ['GET', '/api/v1/dosespot/clinicians/registration-status'],
      ['GET', '/api/v1/dosespot/clinicians/legal-agreements'],
      ['POST', '/api/v1/dosespot/clinicians/legal-agreements/accept'],
      ['GET', '/api/v1/dosespot/clinicians/idp/disclaimer'],
      ['POST', '/api/v1/dosespot/clinicians/idp/disclaimer'],
      ['POST', '/api/v1/dosespot/clinicians/idp/init'],
      ['POST', '/api/v1/dosespot/clinicians/idp/start'],
      ['POST', '/api/v1/dosespot/clinicians/idp/answers'],
      ['POST', '/api/v1/dosespot/clinicians/idp/otp'],
      ['POST', '/api/v1/dosespot/push-notifications/dev/test-activity'],
      ['POST', '/api/v1/dosespot/push-notifications/dev/link-test-clinician'],
      ['POST', '/api/v1/dosespot/patients/ensure'],
      ['POST', '/api/v1/dosespot/patients/:id/preferred-pharmacy/sync'],
      ['POST', '/api/v1/dosespot/patients/delete'],
      ['GET', '/api/v1/dosespot/patients/:id/medication-history'],
      ['POST', '/api/v1/dosespot/patients/:id/medication-history/consent'],
      ['GET', '/api/v1/dosespot/patients/:id/prescriptions'],
      ['GET', '/api/v1/dosespot/queues/refills'],
      ['GET', '/api/v1/dosespot/queues/rxchanges'],
    ] as const;

    for (const [method, path] of versionedDoseSpotRoutes) {
      expectRoute(method, path);
    }
  });

  it('keeps the non-versioned DoseSpot mount during frontend migration', () => {
    expectRoute('GET', '/api/dosespot/sso-url');
    expectRoute('POST', '/api/dosespot/push-notifications');
    expectRoute('GET', '/api/dosespot/push-notifications/validation');
    expectRoute('POST', '/api/dosespot/screen-demo/validation');
    expectRoute('POST', '/api/dosespot/patients/delete');
    expectRoute('GET', '/api/dosespot/queues/rxchanges');
  });
});
