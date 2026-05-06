import assert from 'node:assert/strict';
import test from 'node:test';

import { getPhoneVerificationErrorStatus } from './phone-verification-errors';

test('getPhoneVerificationErrorStatus maps verification failures to client errors', () => {
    assert.equal(getPhoneVerificationErrorStatus(new Error('Verification code was not accepted.')), 400);
    assert.equal(getPhoneVerificationErrorStatus(new Error('No pending verification was found for this phone number.')), 404);
    assert.equal(getPhoneVerificationErrorStatus(new Error('No pending verification code was found. Please request a new code.')), 409);
    assert.equal(getPhoneVerificationErrorStatus(new Error('Verification code has expired. Please request a new code.')), 410);
    assert.equal(getPhoneVerificationErrorStatus(new Error('Maximum verification attempts exceeded. Please request a new code.')), 429);
    assert.equal(getPhoneVerificationErrorStatus(new Error('Only one SMS per user is allowed per minute.')), 429);
});

test('getPhoneVerificationErrorStatus preserves server errors for unknown failures', () => {
    assert.equal(getPhoneVerificationErrorStatus(new Error('TELNYX_API_KEY or TELNYX_SECRET_KEY is not configured.')), 500);
    assert.equal(getPhoneVerificationErrorStatus('unexpected'), 500);
});
