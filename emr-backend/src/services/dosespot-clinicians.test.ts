import test from 'node:test';
import assert from 'node:assert/strict';
import type { DoseSpotClinicianReadiness } from './dosespot-clinicians';
import { doseSpotClinicianTestables } from './dosespot-clinicians';

type ReadinessOverrides = Partial<Omit<DoseSpotClinicianReadiness, 'idp' | 'tfa' | 'pin'>> & {
    idp?: Partial<DoseSpotClinicianReadiness['idp']>;
    tfa?: Partial<DoseSpotClinicianReadiness['tfa']>;
    pin?: Partial<DoseSpotClinicianReadiness['pin']>;
};

function buildReadiness(
    overrides: ReadinessOverrides = {}
): DoseSpotClinicianReadiness {
    const { idp, tfa, pin, ...rest } = overrides;

    return {
        clinicianUid: 'provider-1',
        clinicianId: 3088396,
        readinessStatus: 'not_started',
        clinicianConfirmed: true,
        accountLocked: false,
        agreementsAccepted: true,
        legalAgreements: [],
        idp: {
            initializedAt: null,
            disclaimerAccepted: false,
            disclaimerAcceptedAt: null,
            status: null,
            pendingQuestionsCount: 0,
            questions: [],
            otpRequired: false,
            completedAt: null,
            disclaimer: null,
            lastResponse: null,
            ...idp
        },
        tfa: {
            enabled: false,
            activatedAt: null,
            deactivatedAt: null,
            ...tfa
        },
        pin: {
            resetRequired: false,
            lastResetAt: null,
            ...pin
        },
        lastEventType: null,
        lastEventAt: null,
        lastOperation: null,
        lastError: null,
        ...rest
    };
}

test('deriveReadinessStatus marks agreements_pending before IDP starts', () => {
    const readiness = buildReadiness({ agreementsAccepted: false });

    assert.equal(
        doseSpotClinicianTestables.deriveReadinessStatus(readiness),
        'agreements_pending'
    );
});

test('deriveReadinessStatus prioritizes otp_required during identity proofing', () => {
    const readiness = buildReadiness({
        idp: {
            initializedAt: '2026-03-28T00:00:00.000Z',
            otpRequired: true,
            pendingQuestionsCount: 0
        }
    });

    assert.equal(
        doseSpotClinicianTestables.deriveReadinessStatus(readiness),
        'otp_required'
    );
});

test('deriveReadinessStatus returns ready after IDP completion and TFA activation', () => {
    const readiness = buildReadiness({
        idp: {
            initializedAt: '2026-03-28T00:00:00.000Z',
            completedAt: '2026-03-28T00:05:00.000Z'
        },
        tfa: {
            enabled: true,
            activatedAt: '2026-03-28T00:06:00.000Z'
        }
    });

    assert.equal(
        doseSpotClinicianTestables.deriveReadinessStatus(readiness),
        'ready'
    );
});

test('reduceReadinessWithWebhookEvent records IDP completion and clears pending prompts', () => {
    const readiness = buildReadiness({
        idp: {
            initializedAt: '2026-03-28T00:00:00.000Z',
            pendingQuestionsCount: 2,
            questions: [
                { questionId: 'q1', prompt: 'Question 1', options: [] }
            ],
            otpRequired: true
        }
    });

    const next = doseSpotClinicianTestables.reduceReadinessWithWebhookEvent(
        readiness,
        'ClinicianIDPCompleteSuccess',
        '2026-03-28T01:00:00.000Z'
    );

    assert.equal(next.lastEventType, 'ClinicianIDPCompleteSuccess');
    assert.equal(next.idp.pendingQuestionsCount, 0);
    assert.deepEqual(next.idp.questions, []);
    assert.equal(next.idp.otpRequired, false);
    assert.equal(next.idp.completedAt, '2026-03-28T01:00:00.000Z');
    assert.equal(next.readinessStatus, 'tfa_pending');
});

test('reduceReadinessWithWebhookEvent records lockouts and pin resets as blocking states', () => {
    const locked = doseSpotClinicianTestables.reduceReadinessWithWebhookEvent(
        buildReadiness(),
        'ClinicianLockedOut',
        '2026-03-28T02:00:00.000Z'
    );
    assert.equal(locked.accountLocked, true);
    assert.equal(locked.readinessStatus, 'locked');

    const pinReset = doseSpotClinicianTestables.reduceReadinessWithWebhookEvent(
        buildReadiness(),
        'ClinicianPINReset',
        '2026-03-28T03:00:00.000Z'
    );
    assert.equal(pinReset.pin.resetRequired, true);
    assert.equal(pinReset.readinessStatus, 'pin_reset_required');
});

test('normalizeIdpQuestions extracts questions and answer options from DoseSpot responses', () => {
    const questions = doseSpotClinicianTestables.normalizeIdpQuestions({
        Questions: [
            {
                QuestionId: 'q1',
                QuestionText: 'What street did you live on?',
                Answers: [
                    { AnswerId: 'a1', AnswerText: 'Oak Street' },
                    { AnswerId: 'a2', AnswerText: 'Maple Avenue' }
                ]
            }
        ]
    });

    assert.deepEqual(questions, [
        {
            questionId: 'q1',
            prompt: 'What street did you live on?',
            options: [
                { optionId: 'a1', label: 'Oak Street' },
                { optionId: 'a2', label: 'Maple Avenue' }
            ]
        }
    ]);
});
