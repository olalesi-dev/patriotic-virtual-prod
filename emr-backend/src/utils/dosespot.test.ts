import test from 'node:test';
import assert from 'node:assert/strict';
import { doseSpotPatientTestables } from '../services/dosespot-patients';
import { generateSSOUrl, getDoseSpotAccessToken } from './dosespot';

test('generateSSOUrl includes resolved PatientId after local patient sync resolution', async () => {
    process.env.DOSESPOT_CLINIC_ID = '1007159';
    process.env.DOSESPOT_CLINIC_KEY = 'HPHH63FJA79VHFQQ5S4UR2K9JMVTF2N9';
    process.env.DOSESPOT_BASE_URL = 'https://my.staging.dosespot.com';

    const ensureResult = await doseSpotPatientTestables.ensureDoseSpotPatientWithSource(
        {
            patientUid: 'patient-1',
            firstName: 'Rowena',
            lastName: 'Acacianna',
            dateOfBirth: '1991-04-09',
            gender: 'Female',
            email: 'rowena@example.com',
            address1: '123 Main St',
            address2: null,
            city: 'Boston',
            state: 'MA',
            zipCode: '02118',
            primaryPhone: '6175551212',
            mrn: 'MRN-001',
            existingDoseSpotPatientId: null,
            retryCount: 0
        },
        {},
        {
            searchPatients: async () => [],
            addPatient: async () => 8181,
            editPatient: async (patientId: number) => patientId,
            getPatient: async () => null,
            addPatientPharmacy: async () => undefined
        },
        async () => undefined
    );

    assert.equal(ensureResult.syncStatus, 'ready');
    assert.equal(ensureResult.doseSpotPatientId, 8181);

    const ssoUrl = generateSSOUrl({
        clinicianDoseSpotId: 3088396,
        patientDoseSpotId: ensureResult.doseSpotPatientId ?? undefined
    });

    assert.match(ssoUrl, /PatientId=8181/);
    assert.match(ssoUrl, /^https:\/\/my\.staging\.dosespot\.com\/LoginSingleSignOn\.aspx\?/);
});

test('getDoseSpotAccessToken fetches a fresh DoseSpot token for every REST request', async () => {
    process.env.DOSESPOT_CLINIC_ID = '1007159';
    process.env.DOSESPOT_CLINIC_KEY = 'HPHH63FJA79VHFQQ5S4UR2K9JMVTF2N9';
    process.env.DOSESPOT_USER_ID = '3088396';
    process.env.DOSESPOT_BASE_URL = 'https://my.staging.dosespot.com';
    process.env.DOSESPOT_SUBSCRIPTION_KEY = 'subscription-key';

    const originalFetch = global.fetch;
    let callCount = 0;

    global.fetch = (async (input: RequestInfo | URL) => {
        callCount += 1;
        assert.match(String(input), /\/webapi\/v2\/connect\/token$/);

        return new Response(
            JSON.stringify({
                access_token: `token-${callCount}`,
                expires_in: 300
            }),
            {
                status: 200,
                headers: { 'Content-Type': 'application/json' }
            }
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
