import assert from 'node:assert/strict';
import test from 'node:test';

import {
    HAIR_LOSS_SCREENING_VERSION,
    normalizeHairLossScreening,
} from './hair-loss-screening';

test('normalizeHairLossScreening preserves all required answers and flags review risks', () => {
    const normalized = normalizeHairLossScreening({
        responses: [
            { question_id: 'hair_loss_duration', answer: '6_months_to_1_year' },
            { question_id: 'hair_loss_pattern', answer: 'patchy_specific_spots' },
            {
                question_id: 'hair_loss_medication_history',
                answer: 'currently_taking',
                follow_up: { answer: 'Minoxidil for 8 months' },
            },
            {
                question_id: 'hair_loss_medical_risks',
                answer: ['liver_disease'],
            },
        ],
    }, new Date('2026-05-15T12:00:00.000Z'));

    assert.equal(normalized.screeningVersion, HAIR_LOSS_SCREENING_VERSION);
    assert.equal(normalized.screeningResponses.length, 4);
    assert.equal(normalized.requiresClinicianReview, true);
    assert.deepEqual(
        normalized.screeningFlags.map((flag) => flag.code),
        [
            'hair_loss_pattern:patchy_specific_spots',
            'hair_loss_medical_risks:liver_disease',
        ],
    );
    assert.equal(
        normalized.screeningResponses[2].follow_up?.answer,
        'Minoxidil for 8 months',
    );
});

test('normalizeHairLossScreening requires the current-medication follow-up', () => {
    assert.throws(
        () => normalizeHairLossScreening({
            responses: [
                { question_id: 'hair_loss_duration', answer: 'less_than_6_months' },
                { question_id: 'hair_loss_pattern', answer: 'overall_scalp_thinning' },
                { question_id: 'hair_loss_medication_history', answer: 'currently_taking' },
                { question_id: 'hair_loss_medical_risks', answer: ['none_of_the_above'] },
            ],
        }),
        /Which medication\(s\) and for how long\?/,
    );
});

test('normalizeHairLossScreening keeps none-of-the-above exclusive', () => {
    assert.throws(
        () => normalizeHairLossScreening({
            responses: [
                { question_id: 'hair_loss_duration', answer: 'more_than_3_years' },
                { question_id: 'hair_loss_pattern', answer: 'not_sure' },
                { question_id: 'hair_loss_medication_history', answer: 'no' },
                {
                    question_id: 'hair_loss_medical_risks',
                    answer: ['none_of_the_above', 'liver_disease'],
                },
            ],
        }),
        /None of the above/,
    );
});
