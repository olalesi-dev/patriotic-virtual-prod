import assert from 'node:assert/strict';
import test from 'node:test';

import { buildCheckoutRedirectUrl } from './stripe-checkout-urls';

test('buildCheckoutRedirectUrl preserves the Stripe checkout session placeholder', () => {
    const redirectUrl = buildCheckoutRedirectUrl({
        baseUrl: 'http://localhost:3000',
        targetUrl: 'http://localhost:3000/?payment=success',
        consultationId: 'consult_123',
        sessionId: '{CHECKOUT_SESSION_ID}',
        paymentStatus: 'success',
    });

    assert.equal(
        redirectUrl,
        'http://localhost:3000/?payment=success&session_id={CHECKOUT_SESSION_ID}&consultationId=consult_123',
    );
});
