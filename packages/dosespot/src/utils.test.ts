import assert from 'node:assert/strict';
import test from 'node:test';
import { dosespotConfig, generateSSOUrl, getDoseSpotAccessToken } from './utils';

// Helper to mock config
const mockConfig = (values: Partial<typeof dosespotConfig>) => {
  Object.assign(dosespotConfig, values);
};

test('generateSSOUrl includes basic parameters', async () => {
  mockConfig({
    clinicId: '1007159',
    clinicKey: 'HPHH63FJA79VHFQQ5S4UR2K9JMVTF2N9',
    baseUrl: 'https://my.staging.dosespot.com',
  });

  const ssoUrl = generateSSOUrl({
    clinicianDoseSpotId: 3088396,
    patientDoseSpotId: 8181,
  });

  assert.match(ssoUrl, /SingleSignOnClinicId=1007159/);
  assert.match(ssoUrl, /SingleSignOnUserId=3088396/);
  assert.match(ssoUrl, /PatientId=8181/);
  assert.match(
    ssoUrl,
    /^https:\/\/my\.staging\.dosespot\.com\/LoginSingleSignOn\.aspx\?/,
  );
});

test('getDoseSpotAccessToken fetches a fresh DoseSpot token', async () => {
  mockConfig({
    clinicId: '1007159',
    clinicKey: 'HPHH63FJA79VHFQQ5S4UR2K9JMVTF2N9',
    userId: '3088396',
    baseUrl: 'https://my.staging.dosespot.com',
    subscriptionKey: 'subscription-key',
  });

  const originalFetch = global.fetch;
  let callCount = 0;

  global.fetch = (async (input: RequestInfo | URL) => {
    callCount += 1;
    assert.match(String(input), /\/webapi\/v2\/connect\/token$/);

    return new Response(
      JSON.stringify({
        access_token: `token-${callCount}`,
        expires_in: 300,
      }),
      {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      },
    );
  }) as typeof fetch;

  try {
    const first = await getDoseSpotAccessToken();
    const second = await getDoseSpotAccessToken();

    assert.equal(first, 'token-1');
    assert.equal(second, 'token-2');
    assert.equal(callCount, 2);
  } finally {
    global.fetch = originalFetch;
  }
});
