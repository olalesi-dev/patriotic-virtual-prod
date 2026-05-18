export const HAIR_LOSS_SERVICE_KEY = 'hair_loss';
export const HAIR_LOSS_SCREENING_VERSION = 'hair_loss_v1';

type HairLossOption = {
    value: string;
    label: string;
};

type HairLossQuestion = {
    id: string;
    text: string;
    type: 'single_select' | 'multi_select';
    options: HairLossOption[];
    flagValues?: string[];
    followUp?: {
        id: string;
        text: string;
        requiredWhen: string;
    };
};

export type HairLossScreeningResponse = {
    question_id: string;
    question_text: string;
    answer: string | string[];
    answer_label: string | string[];
    timestamp: string;
    follow_up?: {
        question_id: string;
        question_text: string;
        answer: string;
        timestamp: string;
    };
};

export type HairLossScreeningFlag = {
    question_id: string;
    code: string;
    label: string;
    severity: 'review';
};

export type NormalizedHairLossScreening = {
    screeningVersion: typeof HAIR_LOSS_SCREENING_VERSION;
    screening: {
        version: typeof HAIR_LOSS_SCREENING_VERSION;
        responses: HairLossScreeningResponse[];
        flags: HairLossScreeningFlag[];
        requires_clinician_review: boolean;
        created_at: string;
    };
    screeningResponses: HairLossScreeningResponse[];
    screeningFlags: HairLossScreeningFlag[];
    requiresClinicianReview: boolean;
};

export class HairLossScreeningValidationError extends Error {
    statusCode = 400;

    constructor(message: string) {
        super(message);
        this.name = 'HairLossScreeningValidationError';
    }
}

export const HAIR_LOSS_SCREENING_QUESTIONS: HairLossQuestion[] = [
    {
        id: 'hair_loss_duration',
        text: 'How long have you been experiencing hair loss or thinning?',
        type: 'single_select',
        options: [
            { value: 'less_than_6_months', label: 'Less than 6 months' },
            { value: '6_months_to_1_year', label: '6 months to 1 year' },
            { value: '1_to_3_years', label: '1 to 3 years' },
            { value: 'more_than_3_years', label: 'More than 3 years' },
        ],
    },
    {
        id: 'hair_loss_pattern',
        text: 'Which best describes your hair loss pattern?',
        type: 'single_select',
        options: [
            { value: 'receding_or_crown_thinning', label: 'Receding hairline or thinning at the crown (typical male/female pattern)' },
            { value: 'overall_scalp_thinning', label: 'Overall thinning across the scalp' },
            { value: 'patchy_specific_spots', label: 'Patchy hair loss in specific spots' },
            { value: 'sudden_or_rapid_hair_loss', label: 'Sudden or rapid hair loss' },
            { value: 'not_sure', label: 'Not sure' },
        ],
        flagValues: ['patchy_specific_spots', 'sudden_or_rapid_hair_loss'],
    },
    {
        id: 'hair_loss_medication_history',
        text: 'Are you currently taking, or have you recently taken, any medications for hair loss (e.g., finasteride, minoxidil, dutasteride, spironolactone)?',
        type: 'single_select',
        options: [
            { value: 'currently_taking', label: 'Yes - currently taking' },
            { value: 'past_not_current', label: 'Yes - taken in the past but not currently' },
            { value: 'no', label: 'No' },
        ],
        followUp: {
            id: 'hair_loss_current_medications_detail',
            text: 'Which medication(s) and for how long?',
            requiredWhen: 'currently_taking',
        },
    },
    {
        id: 'hair_loss_medical_risks',
        text: 'Do you have any of the following that we should know about? (Select all that apply)',
        type: 'multi_select',
        options: [
            { value: 'prostate_or_breast_cancer_history', label: 'History of prostate or breast cancer' },
            { value: 'liver_disease', label: 'Liver disease' },
            { value: 'pregnant_planning_or_breastfeeding', label: 'Currently pregnant, planning pregnancy, or breastfeeding' },
            { value: 'allergy_to_related_medications', label: 'Known allergy to finasteride, minoxidil, or related medications' },
            { value: 'none_of_the_above', label: 'None of the above' },
        ],
        flagValues: [
            'prostate_or_breast_cancer_history',
            'liver_disease',
            'pregnant_planning_or_breastfeeding',
            'allergy_to_related_medications',
        ],
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

function findAnswer(rawResponses: unknown[], question: HairLossQuestion): Record<string, unknown> | null {
    for (const response of rawResponses) {
        const record = asRecord(response);
        if (!record) continue;
        const id = asString(record.question_id) || asString(record.questionId);
        if (id === question.id) return record;
    }

    return null;
}

function getAnswerValue(record: Record<string, unknown>, question: HairLossQuestion): string | string[] {
    const rawAnswer = record.answer ?? record.value ?? record.answer_value ?? record.answerValue;
    if (question.type === 'multi_select') {
        if (!Array.isArray(rawAnswer)) {
            throw new HairLossScreeningValidationError(`${question.text} is required.`);
        }

        return rawAnswer.map(asString).filter(Boolean);
    }

    return asString(rawAnswer);
}

function optionLabel(question: HairLossQuestion, value: string): string {
    return question.options.find((option) => option.value === value)?.label ?? value;
}

function normalizeSingleAnswer(question: HairLossQuestion, answer: string): string {
    if (!answer) {
        throw new HairLossScreeningValidationError(`${question.text} is required.`);
    }

    if (!question.options.some((option) => option.value === answer)) {
        throw new HairLossScreeningValidationError(`Invalid answer for ${question.id}.`);
    }

    return answer;
}

function normalizeMultiAnswer(question: HairLossQuestion, answer: string[]): string[] {
    const normalized = Array.from(new Set(answer));
    if (normalized.length === 0) {
        throw new HairLossScreeningValidationError(`${question.text} is required.`);
    }

    const allowed = new Set(question.options.map((option) => option.value));
    if (normalized.some((value) => !allowed.has(value))) {
        throw new HairLossScreeningValidationError(`Invalid answer for ${question.id}.`);
    }

    if (normalized.includes('none_of_the_above') && normalized.length > 1) {
        throw new HairLossScreeningValidationError('"None of the above" cannot be combined with other medical risk selections.');
    }

    return normalized;
}

function makeFlag(question: HairLossQuestion, value: string): HairLossScreeningFlag {
    return {
        question_id: question.id,
        code: `${question.id}:${value}`,
        label: optionLabel(question, value),
        severity: 'review',
    };
}

export function normalizeHairLossScreening(rawScreening: unknown, now = new Date()): NormalizedHairLossScreening {
    const root = asRecord(rawScreening);
    const rawResponses = Array.isArray(root?.responses)
        ? root.responses
        : Array.isArray(rawScreening)
            ? rawScreening
            : [];

    if (rawResponses.length === 0) {
        throw new HairLossScreeningValidationError('Hair loss screening responses are required.');
    }

    const timestamp = now.toISOString();
    const responses: HairLossScreeningResponse[] = [];
    const flags: HairLossScreeningFlag[] = [];

    for (const question of HAIR_LOSS_SCREENING_QUESTIONS) {
        const rawResponse = findAnswer(rawResponses, question);
        if (!rawResponse) {
            throw new HairLossScreeningValidationError(`${question.text} is required.`);
        }

        const rawAnswer = getAnswerValue(rawResponse, question);
        const answer = Array.isArray(rawAnswer)
            ? normalizeMultiAnswer(question, rawAnswer)
            : normalizeSingleAnswer(question, rawAnswer);

        const response: HairLossScreeningResponse = {
            question_id: question.id,
            question_text: question.text,
            answer,
            answer_label: Array.isArray(answer)
                ? answer.map((value) => optionLabel(question, value))
                : optionLabel(question, answer),
            timestamp: asString(rawResponse.timestamp) || timestamp,
        };

        if (question.followUp && answer === question.followUp.requiredWhen) {
            const rawFollowUp = asRecord(rawResponse.follow_up) ?? asRecord(rawResponse.followUp);
            const followUpAnswer = asString(rawFollowUp?.answer ?? rawFollowUp?.value);
            if (!followUpAnswer) {
                throw new HairLossScreeningValidationError(question.followUp.text);
            }

            response.follow_up = {
                question_id: question.followUp.id,
                question_text: question.followUp.text,
                answer: followUpAnswer,
                timestamp: asString(rawFollowUp?.timestamp) || timestamp,
            };
        }

        const flagValues = question.flagValues ?? [];
        const answerValues = Array.isArray(answer) ? answer : [answer];
        answerValues
            .filter((value) => flagValues.includes(value))
            .forEach((value) => flags.push(makeFlag(question, value)));

        responses.push(response);
    }

    const screening = {
        version: HAIR_LOSS_SCREENING_VERSION as typeof HAIR_LOSS_SCREENING_VERSION,
        responses,
        flags,
        requires_clinician_review: flags.length > 0,
        created_at: timestamp,
    };

    return {
        screeningVersion: HAIR_LOSS_SCREENING_VERSION,
        screening,
        screeningResponses: responses,
        screeningFlags: flags,
        requiresClinicianReview: flags.length > 0,
    };
}
