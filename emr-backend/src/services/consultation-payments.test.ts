import assert from 'node:assert/strict';
import test from 'node:test';

import { buildStripeLineItem, CONSULTATION_CATALOG } from './consultation-payments';

test('hair loss consultation uses the configured Stripe product and resolves an active price server-side', async () => {
    const stripeCalls: string[] = [];
    const fakeStripe = {
        products: {
            retrieve: async (productId: string) => {
                stripeCalls.push(`product:${productId}`);
                return {
                    id: productId,
                    default_price: {
                        id: 'price_hair_standard',
                        active: true,
                        recurring: null,
                    },
                };
            },
        },
        prices: {
            list: async () => {
                throw new Error('default price should be used');
            },
        },
    };

    const lineItem = await buildStripeLineItem('hair_loss', fakeStripe as never);

    assert.equal(CONSULTATION_CATALOG.hair_loss.stripeProductId, 'prod_UXVLXwNzWCXPyZ');
    assert.deepEqual(stripeCalls, ['product:prod_UXVLXwNzWCXPyZ']);
    assert.deepEqual(lineItem, {
        quantity: 1,
        price: 'price_hair_standard',
    });
});

test('non-product services keep existing inline price data behavior', async () => {
    const lineItem = await buildStripeLineItem('general_visit');

    assert.equal(lineItem.quantity, 1);
    assert.deepEqual(lineItem.price_data, {
        currency: 'usd',
        product_data: { name: 'General Visit' },
        unit_amount: 7900,
    });
});
