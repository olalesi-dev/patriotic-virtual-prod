import * as admin from 'firebase-admin';
import { doseSpotApiFetch, ensureDoseSpotResultOk, type DoseSpotResult } from './dosespot-rest';

export type DoseSpotClinicianReadinessStatus =
    | 'not_started'
    | 'agreements_pending'
    | 'clinician_confirmation_pending'
    | 'idp_pending'
    | 'idp_questions'
    | 'otp_required'
    | 'tfa_pending'
    | 'pin_reset_required'
    | 'locked'
    | 'ready';

export interface DoseSpotLegalAgreement {
    agreementId: string;
    title: string;
    accepted: boolean;
    acceptedAt: string | null;
    version: string | null;
}

export interface DoseSpotIdpQuestionOption {
    optionId: string;
    label: string;
}

export interface DoseSpotIdpQuestion {
    questionId: string;
    prompt: string;
    options: DoseSpotIdpQuestionOption[];
}

export interface DoseSpotIdpDisclaimer {
    title: string | null;
    body: string | null;
    version: string | null;
}

export interface DoseSpotClinicianReadiness {
    clinicianUid: string;
    clinicianId: number | null;
    readinessStatus: DoseSpotClinicianReadinessStatus;
    clinicianConfirmed: boolean | null;
    accountLocked: boolean;
    agreementsAccepted: boolean;
    legalAgreements: DoseSpotLegalAgreement[];
    idp: {
        initializedAt: string | null;
        disclaimerAccepted: boolean;
        disclaimerAcceptedAt: string | null;
        status: string | null;
        pendingQuestionsCount: number;
        questions: DoseSpotIdpQuestion[];
        otpRequired: boolean;
        completedAt: string | null;
        disclaimer: DoseSpotIdpDisclaimer | null;
        lastResponse: Record<string, unknown> | null;
    };
    tfa: {
        enabled: boolean;
        activatedAt: string | null;
        deactivatedAt: string | null;
    };
    pin: {
        resetRequired: boolean;
        lastResetAt: string | null;
    };
    lastEventType: string | null;
    lastEventAt: string | null;
    lastOperation: string | null;
    lastError: string | null;
}

export interface DoseSpotClinicianActionResponse {
    readiness: DoseSpotClinicianReadiness;
    agreements?: DoseSpotLegalAgreement[];
    disclaimer?: DoseSpotIdpDisclaimer | null;
    questions?: DoseSpotIdpQuestion[];
    otpRequired?: boolean;
    rawResponse?: Record<string, unknown> | unknown[];
    message: string;
}

interface FirestoreDoseSpotState {
    readinessStatus?: string;
    clinicianConfirmed?: boolean | null;
    accountLocked?: boolean;
    agreementsAccepted?: boolean;
    legalAgreements?: unknown;
    idp?: Record<string, unknown>;
    tfa?: Record<string, unknown>;
    pin?: Record<string, unknown>;
    lastEventType?: string | null;
    lastEventAt?: unknown;
    lastOperation?: string | null;
    lastError?: string | null;
}

interface ClinicianContext {
    clinicianUid: string;
    clinicianId: number | null;
    storedState: FirestoreDoseSpotState;
}

interface ResolvedClinicianContext extends ClinicianContext {
    clinicianId: number;
}

type DoseSpotClinicianReadinessPatch = Partial<Omit<DoseSpotClinicianReadiness, 'idp' | 'tfa' | 'pin'>> & {
    idp?: Partial<DoseSpotClinicianReadiness['idp']>;
    tfa?: Partial<DoseSpotClinicianReadiness['tfa']>;
    pin?: Partial<DoseSpotClinicianReadiness['pin']>;
};

function isRecord(value: unknown): value is Record<string, unknown> {
    return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function asNonEmptyString(value: unknown): string | null {
    if (typeof value !== 'string') return null;
    const normalized = value.trim();
    return normalized.length > 0 ? normalized : null;
}

function asNumber(value: unknown): number | null {
    if (typeof value === 'number' && Number.isFinite(value)) return value;
    if (typeof value === 'string') {
        const normalized = value.trim();
        if (!normalized) return null;
        const parsed = Number.parseInt(normalized, 10);
        return Number.isFinite(parsed) ? parsed : null;
    }
    return null;
}

function asBoolean(value: unknown): boolean | null {
    if (typeof value === 'boolean') return value;
    if (typeof value === 'string') {
        const normalized = value.trim().toLowerCase();
        if (normalized === 'true') return true;
        if (normalized === 'false') return false;
    }
    return null;
}

function asDate(value: unknown): Date | null {
    if (!value) return null;
    if (value instanceof Date) {
        return Number.isNaN(value.getTime()) ? null : value;
    }

    if (
        typeof value === 'object' &&
        value !== null &&
        'toDate' in value &&
        typeof (value as { toDate?: unknown }).toDate === 'function'
    ) {
        const parsed = (value as { toDate: () => Date }).toDate();
        return Number.isNaN(parsed.getTime()) ? null : parsed;
    }

    if (typeof value === 'string') {
        const parsed = new Date(value);
        return Number.isNaN(parsed.getTime()) ? null : parsed;
    }

    return null;
}

function toIsoDate(value: unknown): string | null {
    const parsed = asDate(value);
    return parsed ? parsed.toISOString() : null;
}

function toPlainValue(value: unknown): unknown {
    if (value === undefined || value === null) return null;
    if (Array.isArray(value)) {
        return value.map((entry) => toPlainValue(entry));
    }
    if (value instanceof Date) {
        return value.toISOString();
    }
    if (isRecord(value)) {
        const output: Record<string, unknown> = {};
        for (const key of Object.keys(value)) {
            output[key] = toPlainValue(value[key]);
        }
        return output;
    }
    if (typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean') {
        return value;
    }
    return String(value);
}

function extractResponseItems(response: unknown): Record<string, unknown>[] {
    if (Array.isArray(response)) {
        return response.filter(isRecord);
    }

    if (!isRecord(response)) {
        return [];
    }

    const candidates = [
        response.Items,
        response.Item,
        response.Data,
        response.ResultData,
        response.Questions
    ];

    for (const candidate of candidates) {
        if (Array.isArray(candidate)) {
            return candidate.filter(isRecord);
        }
        if (isRecord(candidate)) {
            return [candidate];
        }
    }

    return [response];
}

function pickString(record: Record<string, unknown>, keys: string[]): string | null {
    for (const key of keys) {
        const value = asNonEmptyString(record[key]);
        if (value) return value;
    }
    return null;
}

function pickBoolean(record: Record<string, unknown>, keys: string[]): boolean | null {
    for (const key of keys) {
        const value = asBoolean(record[key]);
        if (value !== null) return value;
    }
    return null;
}

function normalizeLegalAgreements(response: unknown): DoseSpotLegalAgreement[] {
    return extractResponseItems(response)
        .map((record, index) => {
            const agreementId = pickString(record, ['LegalAgreementId', 'AgreementId', 'Id']) ?? `agreement-${index + 1}`;
            const title = pickString(record, ['LegalAgreementName', 'AgreementName', 'Name', 'Title']) ?? `Agreement ${index + 1}`;
            const accepted = pickBoolean(record, ['Accepted', 'IsAccepted', 'Agreed']) ?? false;
            const acceptedAt = toIsoDate(record.AcceptedAt ?? record.AcceptedDate ?? record.AgreedAt);
            const version = pickString(record, ['Version', 'AgreementVersion']);

            return {
                agreementId,
                title,
                accepted,
                acceptedAt,
                version
            } satisfies DoseSpotLegalAgreement;
        })
        .filter((agreement, index, agreements) => agreements.findIndex((candidate) => candidate.agreementId === agreement.agreementId) === index);
}

function normalizeDisclaimer(response: unknown): DoseSpotIdpDisclaimer | null {
    const [record] = extractResponseItems(response);
    if (!record) return null;

    return {
        title: pickString(record, ['DisclaimerTitle', 'Title', 'Name']),
        body: pickString(record, ['DisclaimerText', 'Body', 'Text', 'Content', 'HtmlText']),
        version: pickString(record, ['Version', 'DisclaimerVersion'])
    };
}

function normalizeQuestionOptions(value: unknown): DoseSpotIdpQuestionOption[] {
    if (!Array.isArray(value)) return [];

    return value
        .filter(isRecord)
        .map((record, index) => ({
            optionId: pickString(record, ['AnswerId', 'OptionId', 'Id']) ?? `option-${index + 1}`,
            label: pickString(record, ['AnswerText', 'OptionText', 'Text', 'Label']) ?? `Option ${index + 1}`
        }))
        .filter((option, index, options) => options.findIndex((candidate) => candidate.optionId === option.optionId) === index);
}

function normalizeIdpQuestions(response: unknown): DoseSpotIdpQuestion[] {
    const questions = isRecord(response) && Array.isArray(response.Questions)
        ? response.Questions.filter(isRecord)
        : extractResponseItems(response);

    return questions
        .map((record, index) => ({
            questionId: pickString(record, ['QuestionId', 'Id']) ?? `question-${index + 1}`,
            prompt: pickString(record, ['QuestionText', 'Prompt', 'Text']) ?? `Question ${index + 1}`,
            options: normalizeQuestionOptions(record.Answers ?? record.Options ?? record.Choices)
        }))
        .filter((question, index, items) => items.findIndex((candidate) => candidate.questionId === question.questionId) === index);
}

function detectOtpRequired(response: unknown): boolean {
    if (!isRecord(response)) return false;

    const direct = pickBoolean(response, ['RequiresOtp', 'OtpRequired', 'IsOtpRequired']);
    if (direct !== null) return direct;

    const status = pickString(response, ['Status', 'NextStep', 'ResultDescription'])?.toLowerCase() ?? '';
    return status.includes('otp');
}

function deriveReadinessStatus(readiness: DoseSpotClinicianReadiness): DoseSpotClinicianReadinessStatus {
    if (readiness.accountLocked) return 'locked';
    if (readiness.pin.resetRequired) return 'pin_reset_required';
    if (!readiness.agreementsAccepted) return 'agreements_pending';
    if (readiness.clinicianConfirmed === false) return 'clinician_confirmation_pending';
    if (readiness.idp.otpRequired) return 'otp_required';
    if (readiness.idp.pendingQuestionsCount > 0) return 'idp_questions';
    if (readiness.idp.initializedAt && !readiness.idp.completedAt) return 'idp_pending';
    if (readiness.idp.completedAt && !readiness.tfa.enabled) return 'tfa_pending';
    if (readiness.idp.completedAt && readiness.tfa.enabled) return 'ready';
    return 'not_started';
}

function normalizeStoredReadiness(
    clinicianUid: string,
    clinicianId: number | null,
    storedState: FirestoreDoseSpotState
): DoseSpotClinicianReadiness {
    const legalAgreements = Array.isArray(storedState.legalAgreements)
        ? storedState.legalAgreements.filter(isRecord).map((record, index) => ({
            agreementId: pickString(record, ['agreementId']) ?? `agreement-${index + 1}`,
            title: pickString(record, ['title']) ?? `Agreement ${index + 1}`,
            accepted: pickBoolean(record, ['accepted']) ?? false,
            acceptedAt: toIsoDate(record.acceptedAt),
            version: pickString(record, ['version'])
        }))
        : [];
    const idp = isRecord(storedState.idp) ? storedState.idp : {};
    const tfa = isRecord(storedState.tfa) ? storedState.tfa : {};
    const pin = isRecord(storedState.pin) ? storedState.pin : {};
    const readiness: DoseSpotClinicianReadiness = {
        clinicianUid,
        clinicianId,
        readinessStatus: 'not_started',
        clinicianConfirmed: asBoolean(storedState.clinicianConfirmed),
        accountLocked: asBoolean(storedState.accountLocked) ?? false,
        agreementsAccepted: asBoolean(storedState.agreementsAccepted) ?? legalAgreements.every((agreement) => agreement.accepted),
        legalAgreements,
        idp: {
            initializedAt: toIsoDate(idp.initializedAt),
            disclaimerAccepted: asBoolean(idp.disclaimerAccepted) ?? false,
            disclaimerAcceptedAt: toIsoDate(idp.disclaimerAcceptedAt),
            status: asNonEmptyString(idp.status),
            pendingQuestionsCount: asNumber(idp.pendingQuestionsCount) ?? 0,
            questions: Array.isArray(idp.questions)
                ? idp.questions.filter(isRecord).map((question, index) => ({
                    questionId: pickString(question, ['questionId']) ?? `question-${index + 1}`,
                    prompt: pickString(question, ['prompt']) ?? `Question ${index + 1}`,
                    options: normalizeQuestionOptions(question.options)
                }))
                : [],
            otpRequired: asBoolean(idp.otpRequired) ?? false,
            completedAt: toIsoDate(idp.completedAt),
            disclaimer: isRecord(idp.disclaimer)
                ? {
                    title: pickString(idp.disclaimer, ['title']),
                    body: pickString(idp.disclaimer, ['body']),
                    version: pickString(idp.disclaimer, ['version'])
                }
                : null,
            lastResponse: isRecord(idp.lastResponse) ? idp.lastResponse : null
        },
        tfa: {
            enabled: asBoolean(tfa.enabled) ?? false,
            activatedAt: toIsoDate(tfa.activatedAt),
            deactivatedAt: toIsoDate(tfa.deactivatedAt)
        },
        pin: {
            resetRequired: asBoolean(pin.resetRequired) ?? false,
            lastResetAt: toIsoDate(pin.lastResetAt)
        },
        lastEventType: asNonEmptyString(storedState.lastEventType),
        lastEventAt: toIsoDate(storedState.lastEventAt),
        lastOperation: asNonEmptyString(storedState.lastOperation),
        lastError: asNonEmptyString(storedState.lastError)
    };

    readiness.readinessStatus = deriveReadinessStatus(readiness);
    return readiness;
}

async function loadClinicianContext(clinicianUid: string): Promise<ClinicianContext> {
    const userDoc = await admin.firestore().collection('users').doc(clinicianUid).get();
    if (!userDoc.exists) {
        return {
            clinicianUid,
            clinicianId: null,
            storedState: {}
        };
    }

    const userData = userDoc.data() as Record<string, unknown>;
    return {
        clinicianUid,
        clinicianId: asNumber(userData.doseSpotClinicianId),
        storedState: isRecord(userData.doseSpot) ? userData.doseSpot as FirestoreDoseSpotState : {}
    };
}

async function persistClinicianReadiness(readiness: DoseSpotClinicianReadiness): Promise<void> {
    const now = new Date();
    const payload: Record<string, unknown> = {
        'doseSpot.readinessStatus': readiness.readinessStatus,
        'doseSpot.clinicianConfirmed': readiness.clinicianConfirmed,
        'doseSpot.accountLocked': readiness.accountLocked,
        'doseSpot.agreementsAccepted': readiness.agreementsAccepted,
        'doseSpot.legalAgreements': readiness.legalAgreements,
        'doseSpot.idp': {
            ...readiness.idp,
            lastResponse: readiness.idp.lastResponse ? toPlainValue(readiness.idp.lastResponse) : null
        },
        'doseSpot.tfa': readiness.tfa,
        'doseSpot.pin': readiness.pin,
        'doseSpot.lastEventType': readiness.lastEventType,
        'doseSpot.lastEventAt': readiness.lastEventAt ? new Date(readiness.lastEventAt) : null,
        'doseSpot.lastOperation': readiness.lastOperation,
        'doseSpot.lastError': readiness.lastError,
        updatedAt: now
    };

    if (readiness.clinicianId) {
        payload.doseSpotClinicianId = readiness.clinicianId;
    }

    await admin.firestore().collection('users').doc(readiness.clinicianUid).set(payload, { merge: true });
}

function withReadinessPatch(
    readiness: DoseSpotClinicianReadiness,
    patch: DoseSpotClinicianReadinessPatch
): DoseSpotClinicianReadiness {
    const nextReadiness: DoseSpotClinicianReadiness = {
        ...readiness,
        ...patch,
        idp: patch.idp ? { ...readiness.idp, ...patch.idp } : readiness.idp,
        tfa: patch.tfa ? { ...readiness.tfa, ...patch.tfa } : readiness.tfa,
        pin: patch.pin ? { ...readiness.pin, ...patch.pin } : readiness.pin
    };

    nextReadiness.readinessStatus = deriveReadinessStatus(nextReadiness);
    return nextReadiness;
}

function mergeClinicianId(body: Record<string, unknown>, clinicianId: number): Record<string, unknown> {
    if (body.ClinicianId || body.clinicianId) {
        return body;
    }

    return {
        ...body,
        ClinicianId: clinicianId
    };
}

function toResponseObject(value: unknown): Record<string, unknown> | unknown[] {
    if (Array.isArray(value)) {
        return value.map((entry) => toPlainValue(entry)) as unknown[];
    }
    if (isRecord(value)) {
        return toPlainValue(value) as Record<string, unknown>;
    }
    return { value: toPlainValue(value) };
}

function updateReadinessFromAgreements(
    readiness: DoseSpotClinicianReadiness,
    agreements: DoseSpotLegalAgreement[],
    operation: string
): DoseSpotClinicianReadiness {
    const agreementsAccepted = agreements.length > 0
        ? agreements.every((agreement) => agreement.accepted)
        : readiness.agreementsAccepted;

    return withReadinessPatch(readiness, {
        agreementsAccepted,
        legalAgreements: agreements.length > 0 ? agreements : readiness.legalAgreements,
        lastOperation: operation,
        lastError: null
    });
}

function updateReadinessFromIdpResponse(
    readiness: DoseSpotClinicianReadiness,
    response: Record<string, unknown> | unknown[],
    operation: string
): DoseSpotClinicianReadiness {
    const questions = normalizeIdpQuestions(response);
    const disclaimer = normalizeDisclaimer(response);
    const otpRequired = detectOtpRequired(response);
    const nowIso = new Date().toISOString();
    const result = Array.isArray(response) ? undefined : (isRecord(response.Result) ? response.Result as DoseSpotResult : undefined);
    ensureDoseSpotResultOk(result, operation);

    return withReadinessPatch(readiness, {
        lastOperation: operation,
        lastError: null,
        idp: {
            initializedAt: operation === 'idp.init' ? nowIso : readiness.idp.initializedAt,
            disclaimerAccepted: operation === 'idp.disclaimer.accept'
                ? true
                : readiness.idp.disclaimerAccepted,
            disclaimerAcceptedAt: operation === 'idp.disclaimer.accept'
                ? nowIso
                : readiness.idp.disclaimerAcceptedAt,
            status: otpRequired
                ? 'otp_required'
                : questions.length > 0
                    ? 'questions_pending'
                    : operation === 'idp.otp'
                        ? 'completed'
                        : operation === 'idp.start' || operation === 'idp.answers'
                            ? 'submitted'
                            : readiness.idp.status,
            pendingQuestionsCount: questions.length > 0 ? questions.length : (operation === 'idp.otp' ? 0 : readiness.idp.pendingQuestionsCount),
            questions: questions.length > 0 ? questions : (operation === 'idp.otp' ? [] : readiness.idp.questions),
            otpRequired,
            completedAt: operation === 'idp.otp'
                ? nowIso
                : readiness.idp.completedAt,
            disclaimer: disclaimer ?? readiness.idp.disclaimer,
            lastResponse: Array.isArray(response) ? { items: response } : response
        }
    });
}

function reduceReadinessWithWebhookEvent(
    readiness: DoseSpotClinicianReadiness,
    eventType: string,
    eventTimestamp: string | null
): DoseSpotClinicianReadiness {
    const nowIso = eventTimestamp ?? new Date().toISOString();

    switch (eventType) {
        case 'ClinicianConfirmed':
            return withReadinessPatch(readiness, {
                clinicianConfirmed: true,
                lastEventType: eventType,
                lastEventAt: nowIso,
                lastError: null
            });
        case 'ClinicianLockedOut':
            return withReadinessPatch(readiness, {
                accountLocked: true,
                lastEventType: eventType,
                lastEventAt: nowIso
            });
        case 'ClinicianIDPCompleteSuccess':
            return withReadinessPatch(readiness, {
                lastEventType: eventType,
                lastEventAt: nowIso,
                lastError: null,
                idp: {
                    status: 'completed',
                    otpRequired: false,
                    pendingQuestionsCount: 0,
                    questions: [],
                    completedAt: nowIso
                }
            });
        case 'ClinicianTfaActivateSuccess':
            return withReadinessPatch(readiness, {
                lastEventType: eventType,
                lastEventAt: nowIso,
                lastError: null,
                tfa: {
                    enabled: true,
                    activatedAt: nowIso
                }
            });
        case 'ClinicianTfaDeactivateSuccess':
            return withReadinessPatch(readiness, {
                lastEventType: eventType,
                lastEventAt: nowIso,
                tfa: {
                    enabled: false,
                    deactivatedAt: nowIso
                }
            });
        case 'ClinicianPINReset':
            return withReadinessPatch(readiness, {
                lastEventType: eventType,
                lastEventAt: nowIso,
                pin: {
                    resetRequired: true,
                    lastResetAt: nowIso
                }
            });
        default:
            return withReadinessPatch(readiness, {
                lastEventType: eventType,
                lastEventAt: nowIso
            });
    }
}

async function requireClinicianContext(clinicianUid: string): Promise<ResolvedClinicianContext> {
    const context = await loadClinicianContext(clinicianUid);
    if (!context.clinicianId) {
        throw new Error('Provider is not configured with a DoseSpot clinician ID.');
    }
    return context as ResolvedClinicianContext;
}

async function buildStoredReadiness(clinicianUid: string): Promise<DoseSpotClinicianReadiness> {
    const context = await loadClinicianContext(clinicianUid);
    return normalizeStoredReadiness(context.clinicianUid, context.clinicianId, context.storedState);
}

export async function getDoseSpotClinicianReadinessForUid(clinicianUid: string): Promise<DoseSpotClinicianReadiness> {
    return buildStoredReadiness(clinicianUid);
}

export async function fetchDoseSpotLegalAgreementsForUid(clinicianUid: string): Promise<DoseSpotClinicianActionResponse> {
    const context = await requireClinicianContext(clinicianUid);
    const response = await doseSpotApiFetch<Record<string, unknown> | unknown[]>(
        `api/clinicians/${context.clinicianId}/legalAgreements`,
        {
            method: 'GET',
            onBehalfOfClinicianId: context.clinicianId
        }
    );
    const agreements = normalizeLegalAgreements(response);
    const readiness = updateReadinessFromAgreements(
        normalizeStoredReadiness(context.clinicianUid, context.clinicianId, context.storedState),
        agreements,
        'legal_agreements.fetch'
    );
    await persistClinicianReadiness(readiness);

    return {
        readiness,
        agreements,
        rawResponse: toResponseObject(response),
        message: agreements.length > 0
            ? 'Loaded DoseSpot legal agreements.'
            : 'DoseSpot did not return any clinician legal agreements.'
    };
}

export async function acceptDoseSpotLegalAgreementForUid(
    clinicianUid: string,
    body: Record<string, unknown>
): Promise<DoseSpotClinicianActionResponse> {
    const context = await requireClinicianContext(clinicianUid);
    const response = await doseSpotApiFetch<Record<string, unknown> | unknown[]>(
        'api/clinicians/acceptAgreement',
        {
            method: 'POST',
            body: mergeClinicianId(body, context.clinicianId),
            onBehalfOfClinicianId: context.clinicianId
        }
    );

    if (isRecord(response) && isRecord(response.Result)) {
        ensureDoseSpotResultOk(response.Result as DoseSpotResult, 'accept agreement');
    }

    const agreements = normalizeLegalAgreements(response);
    const current = normalizeStoredReadiness(context.clinicianUid, context.clinicianId, context.storedState);
    const fallbackAgreements = agreements.length > 0
        ? agreements
        : current.legalAgreements.map((agreement) => (
            agreement.agreementId === asNonEmptyString(body.AgreementId ?? body.LegalAgreementId ?? body.agreementId)
                ? { ...agreement, accepted: true, acceptedAt: new Date().toISOString() }
                : agreement
        ));
    const readiness = updateReadinessFromAgreements(current, fallbackAgreements, 'legal_agreements.accept');
    await persistClinicianReadiness(readiness);

    return {
        readiness,
        agreements: fallbackAgreements,
        rawResponse: toResponseObject(response),
        message: 'DoseSpot legal agreement acceptance submitted.'
    };
}

export async function initDoseSpotIdpForUid(clinicianUid: string): Promise<DoseSpotClinicianActionResponse> {
    const context = await requireClinicianContext(clinicianUid);
    const response = await doseSpotApiFetch<Record<string, unknown> | unknown[]>(
        `api/clinicians/${context.clinicianId}/idpInit`,
        {
            method: 'GET',
            onBehalfOfClinicianId: context.clinicianId
        }
    );
    const current = normalizeStoredReadiness(context.clinicianUid, context.clinicianId, context.storedState);
    const readiness = updateReadinessFromIdpResponse(current, response, 'idp.init');
    await persistClinicianReadiness(readiness);

    return {
        readiness,
        questions: readiness.idp.questions,
        otpRequired: readiness.idp.otpRequired,
        rawResponse: toResponseObject(response),
        message: 'DoseSpot IDP initialization loaded.'
    };
}

export async function fetchDoseSpotIdpDisclaimerForUid(clinicianUid: string): Promise<DoseSpotClinicianActionResponse> {
    const context = await requireClinicianContext(clinicianUid);
    const response = await doseSpotApiFetch<Record<string, unknown> | unknown[]>(
        'api/clinicians/idpDisclaimer',
        {
            method: 'GET',
            onBehalfOfClinicianId: context.clinicianId
        }
    );
    const current = normalizeStoredReadiness(context.clinicianUid, context.clinicianId, context.storedState);
    const readiness = updateReadinessFromIdpResponse(current, response, 'idp.disclaimer.fetch');
    await persistClinicianReadiness(readiness);

    return {
        readiness,
        disclaimer: readiness.idp.disclaimer,
        rawResponse: toResponseObject(response),
        message: readiness.idp.disclaimer
            ? 'Loaded DoseSpot IDP disclaimer.'
            : 'DoseSpot did not return a structured disclaimer.'
    };
}

export async function acceptDoseSpotIdpDisclaimerForUid(
    clinicianUid: string,
    body: Record<string, unknown>
): Promise<DoseSpotClinicianActionResponse> {
    const context = await requireClinicianContext(clinicianUid);
    const response = await doseSpotApiFetch<Record<string, unknown> | unknown[]>(
        'api/clinicians/idpDisclaimer',
        {
            method: 'POST',
            body: mergeClinicianId(body, context.clinicianId),
            onBehalfOfClinicianId: context.clinicianId
        }
    );
    const current = normalizeStoredReadiness(context.clinicianUid, context.clinicianId, context.storedState);
    const readiness = updateReadinessFromIdpResponse(current, response, 'idp.disclaimer.accept');
    await persistClinicianReadiness(readiness);

    return {
        readiness,
        disclaimer: readiness.idp.disclaimer,
        rawResponse: toResponseObject(response),
        message: 'DoseSpot IDP disclaimer acceptance submitted.'
    };
}

export async function startDoseSpotIdpForUid(
    clinicianUid: string,
    body: Record<string, unknown>
): Promise<DoseSpotClinicianActionResponse> {
    const context = await requireClinicianContext(clinicianUid);
    const response = await doseSpotApiFetch<Record<string, unknown> | unknown[]>(
        'api/clinicians/idp',
        {
            method: 'POST',
            body: mergeClinicianId(body, context.clinicianId),
            onBehalfOfClinicianId: context.clinicianId
        }
    );
    const current = normalizeStoredReadiness(context.clinicianUid, context.clinicianId, context.storedState);
    const readiness = updateReadinessFromIdpResponse(current, response, 'idp.start');
    await persistClinicianReadiness(readiness);

    return {
        readiness,
        questions: readiness.idp.questions,
        otpRequired: readiness.idp.otpRequired,
        rawResponse: toResponseObject(response),
        message: 'DoseSpot IDP request submitted.'
    };
}

export async function submitDoseSpotIdpAnswersForUid(
    clinicianUid: string,
    body: Record<string, unknown>
): Promise<DoseSpotClinicianActionResponse> {
    const context = await requireClinicianContext(clinicianUid);
    const response = await doseSpotApiFetch<Record<string, unknown> | unknown[]>(
        'api/clinicians/idpAnswers',
        {
            method: 'POST',
            body: mergeClinicianId(body, context.clinicianId),
            onBehalfOfClinicianId: context.clinicianId
        }
    );
    const current = normalizeStoredReadiness(context.clinicianUid, context.clinicianId, context.storedState);
    const readiness = updateReadinessFromIdpResponse(current, response, 'idp.answers');
    await persistClinicianReadiness(readiness);

    return {
        readiness,
        questions: readiness.idp.questions,
        otpRequired: readiness.idp.otpRequired,
        rawResponse: toResponseObject(response),
        message: readiness.idp.otpRequired
            ? 'DoseSpot IDP answers accepted. OTP verification is now required.'
            : readiness.idp.pendingQuestionsCount > 0
                ? 'DoseSpot returned additional identity-proofing questions.'
                : 'DoseSpot IDP answers submitted.'
    };
}

export async function submitDoseSpotIdpOtpForUid(
    clinicianUid: string,
    body: Record<string, unknown>
): Promise<DoseSpotClinicianActionResponse> {
    const context = await requireClinicianContext(clinicianUid);
    const response = await doseSpotApiFetch<Record<string, unknown> | unknown[]>(
        'api/clinicians/idpOtp',
        {
            method: 'POST',
            body: mergeClinicianId(body, context.clinicianId),
            onBehalfOfClinicianId: context.clinicianId
        }
    );
    const current = normalizeStoredReadiness(context.clinicianUid, context.clinicianId, context.storedState);
    const readiness = updateReadinessFromIdpResponse(current, response, 'idp.otp');
    await persistClinicianReadiness(readiness);

    return {
        readiness,
        otpRequired: readiness.idp.otpRequired,
        rawResponse: toResponseObject(response),
        message: readiness.idp.completedAt
            ? 'DoseSpot OTP verification submitted.'
            : 'DoseSpot OTP submission returned an incomplete response.'
    };
}

export async function applyDoseSpotClinicianWebhookEvent(
    clinicianUid: string,
    eventType: string,
    payload: Record<string, unknown>
): Promise<DoseSpotClinicianReadiness> {
    const current = await buildStoredReadiness(clinicianUid);
    const eventTimestamp = toIsoDate(
        (isRecord(payload.Data) ? payload.Data.EventTime : null) ??
        payload.EventTime ??
        payload.CreatedAt ??
        payload.UpdatedAt
    );
    const readiness = reduceReadinessWithWebhookEvent(current, eventType, eventTimestamp);
    await persistClinicianReadiness(readiness);
    return readiness;
}

export const doseSpotClinicianTestables = {
    deriveReadinessStatus,
    normalizeDisclaimer,
    normalizeIdpQuestions,
    normalizeLegalAgreements,
    reduceReadinessWithWebhookEvent
};
