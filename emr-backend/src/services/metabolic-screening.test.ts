import assert from 'node:assert/strict';
import test from 'node:test';

import {
    METABOLIC_HOLD_MESSAGE,
    METABOLIC_SCREENING_QUESTIONS,
    MetabolicScreeningValidationError,
    normalizeMetabolicScreening,
} from './metabolic-screening';

function responses(answer: boolean) {
    return METABOLIC_SCREENING_QUESTIONS.map((question) => ({
        question_id: question.id,
        answer,
    }));
}

test('normalizeMetabolicScreening allows payment when every safety answer is no', () => {
    const normalized = normalizeMetabolicScreening({ responses: responses(false) });

    assert.equal(normalized.screeningVersion, 'metabolic_wellness_v1');
    assert.equal(normalized.paymentEligible, true);
    assert.equal(normalized.requiresClinicianReview, false);
    assert.equal(normalized.screeningFlags.length, 0);
    assert.equal(normalized.screeningResponses.length, METABOLIC_SCREENING_QUESTIONS.length);
    assert.equal(normalized.screeningResponses[0].answer_label, 'No');
});

test('normalizeMetabolicScreening flags any yes response and returns hold details', () => {
    const rawResponses = responses(false);
    rawResponses[1] = {
        question_id: METABOLIC_SCREENING_QUESTIONS[1].id,
        answer: true,
    };

    const normalized = normalizeMetabolicScreening({ responses: rawResponses });

    assert.equal(normalized.paymentEligible, false);
    assert.equal(normalized.requiresClinicianReview, true);
    assert.equal(normalized.holdMessage, METABOLIC_HOLD_MESSAGE);
    assert.deepEqual(normalized.screeningFlags.map((flag) => flag.code), [
        'metabolic_liver_disease_or_cirrhosis:yes',
    ]);
});

test('normalizeMetabolicScreening requires every question', () => {
    assert.throws(
        () => normalizeMetabolicScreening({ responses: responses(false).slice(1) }),
        MetabolicScreeningValidationError,
    );
});
