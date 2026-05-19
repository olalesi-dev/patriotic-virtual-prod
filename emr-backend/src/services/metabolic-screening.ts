export const METABOLIC_SERVICE_KEY = 'metabolic_wellness';
export const METABOLIC_SCREENING_VERSION = 'metabolic_wellness_v1';
export const METABOLIC_HOLD_MESSAGE = 'A physician will review your intake. We will contact you within 1 business day.';

type MetabolicQuestion = {
    id: string;
    text: string;
};

export type MetabolicScreeningResponse = {
    question_id: string;
    question_text: string;
    answer: boolean;
    answer_label: 'Yes' | 'No';
    timestamp: string;
};

export type MetabolicScreeningFlag = {
    question_id: string;
    code: string;
    label: string;
    severity: 'hold';
};

export type NormalizedMetabolicScreening = {
    screeningVersion: typeof METABOLIC_SCREENING_VERSION;
    screening: {
        version: typeof METABOLIC_SCREENING_VERSION;
        responses: MetabolicScreeningResponse[];
        flags: MetabolicScreeningFlag[];
        requires_clinician_review: boolean;
        payment_eligible: boolean;
        hold_message: string | null;
        created_at: string;
    };
    screeningResponses: MetabolicScreeningResponse[];
    screeningFlags: MetabolicScreeningFlag[];
    requiresClinicianReview: boolean;
    paymentEligible: boolean;
    holdMessage: string | null;
};

export class MetabolicScreeningValidationError extends Error {
    statusCode = 400;

    constructor(message: string) {
        super(message);
        this.name = 'MetabolicScreeningValidationError';
    }
}

export const METABOLIC_SCREENING_QUESTIONS: MetabolicQuestion[] = [
    {
        id: 'metabolic_active_cardiovascular_condition',
        text: 'Do you have any active cardiovascular conditions (heart disease, recent MI, stroke)?',
    },
    {
        id: 'metabolic_liver_disease_or_cirrhosis',
        text: 'Have you been diagnosed with liver disease or cirrhosis?',
    },
    {
        id: 'metabolic_active_thyroid_treatment',
        text: 'Do you have an active thyroid condition currently being treated?',
    },
    {
        id: 'metabolic_pregnant_or_planning',
        text: 'Are you pregnant or planning to become pregnant?',
    },
    {
        id: 'metabolic_pacemaker_or_implanted_metal',
        text: 'Do you have a pacemaker or implanted metal device?',
    },
];

function asRecord(value: unknown): Record<string, unknown> | null {
    return value && typeof value === 'object' && !Array.isArray(value)
        ? value as Record<string, unknown>
        : null;
}

function asString(value: unknown): string {
    return typeof value === 'string' ? value.trim() : '';
}

function findAnswer(rawResponses: unknown[], question: MetabolicQuestion): Record<string, unknown> | null {
    for (const response of rawResponses) {
        const record = asRecord(response);
        if (!record) continue;
        const id = asString(record.question_id) || asString(record.questionId);
        if (id === question.id) return record;
    }

    return null;
}

function normalizeYesNo(rawAnswer: unknown, question: MetabolicQuestion): boolean {
    if (typeof rawAnswer === 'boolean') return rawAnswer;

    const answer = asString(rawAnswer).toLowerCase();
    if (['yes', 'true', 'y', '1'].includes(answer)) return true;
    if (['no', 'false', 'n', '0'].includes(answer)) return false;

    throw new MetabolicScreeningValidationError(`${question.text} is required.`);
}

function makeFlag(question: MetabolicQuestion): MetabolicScreeningFlag {
    return {
        question_id: question.id,
        code: `${question.id}:yes`,
        label: question.text,
        severity: 'hold',
    };
}

export function normalizeMetabolicScreening(rawScreening: unknown, now = new Date()): NormalizedMetabolicScreening {
    const screeningRecord = asRecord(rawScreening);
    const rawResponses = Array.isArray(screeningRecord?.responses)
        ? screeningRecord.responses
        : Array.isArray(rawScreening)
            ? rawScreening
            : [];

    if (rawResponses.length === 0) {
        throw new MetabolicScreeningValidationError('Metabolic safety screening responses are required.');
    }

    const timestamp = now.toISOString();
    const responses: MetabolicScreeningResponse[] = [];
    const flags: MetabolicScreeningFlag[] = [];

    for (const question of METABOLIC_SCREENING_QUESTIONS) {
        const answerRecord = findAnswer(rawResponses, question);
        if (!answerRecord) {
            throw new MetabolicScreeningValidationError(`${question.text} is required.`);
        }

        const answer = normalizeYesNo(
            answerRecord.answer ?? answerRecord.value ?? answerRecord.answer_value ?? answerRecord.answerValue,
            question,
        );
        responses.push({
            question_id: question.id,
            question_text: question.text,
            answer,
            answer_label: answer ? 'Yes' : 'No',
            timestamp: asString(answerRecord.timestamp) || timestamp,
        });

        if (answer) {
            flags.push(makeFlag(question));
        }
    }

    const requiresClinicianReview = flags.length > 0;
    const paymentEligible = !requiresClinicianReview;

    return {
        screeningVersion: METABOLIC_SCREENING_VERSION,
        screening: {
            version: METABOLIC_SCREENING_VERSION,
            responses,
            flags,
            requires_clinician_review: requiresClinicianReview,
            payment_eligible: paymentEligible,
            hold_message: paymentEligible ? null : METABOLIC_HOLD_MESSAGE,
            created_at: timestamp,
        },
        screeningResponses: responses,
        screeningFlags: flags,
        requiresClinicianReview,
        paymentEligible,
        holdMessage: paymentEligible ? null : METABOLIC_HOLD_MESSAGE,
    };
}
