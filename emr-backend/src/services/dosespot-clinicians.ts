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

export interface DoseSpotClinicianSyncResponse {
    clinicianUid: string;
    clinicianId: number | null;
    synced: boolean;
    registrationStatus: string | null;
    missingFields: string[];
    message: string;
    rawResponse?: Record<string, unknown> | unknown[];
}

export interface DoseSpotClinicianRegistrationStatusResponse {
    clinicianUid: string;
    clinicianId: number | null;
    registrationStatus: string | null;
    synced: boolean;
    message: string;
    rawResponse?: Record<string, unknown> | unknown[];
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
    synced?: boolean;
    registrationStatus?: string | null;
    lastSyncAt?: unknown;
    registrationStatusCheckedAt?: unknown;
    lastSyncError?: string | null;
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

function toOptionalIsoDateOnly(value: unknown): string | null {
    if (typeof value !== 'string') return null;
    const normalized = value.trim();
    if (!normalized) return null;
    if (/^\d{4}-\d{2}-\d{2}$/.test(normalized)) {
        return `${normalized}T00:00:00.000Z`;
    }

    const parsed = new Date(normalized);
    if (Number.isNaN(parsed.getTime())) {
        return null;
    }

    return parsed.toISOString();
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

function toTrimmedStringArray(value: unknown): string[] {
    if (!Array.isArray(value)) return [];
    return value
        .map((entry) => asNonEmptyString(entry))
        .filter((entry): entry is string => Boolean(entry));
}

function normalizeRole(value: unknown): string | null {
    const normalized = asNonEmptyString(value)?.toLowerCase() ?? null;
    return normalized && normalized.length > 0 ? normalized : null;
}

function normalizePdmpRoleType(value: string | null): string | null {
    if (!value) return null;
    const normalized = value.trim();
    if (!normalized) return null;
    if (normalized === 'NursePracticioner') {
        return 'NursePractitioner';
    }
    return normalized;
}

function mapPdmpRoleTypeToDoseSpotValue(value: string | null): number | null {
    if (!value) return null;

    const normalized = normalizePdmpRoleType(value);
    if (!normalized) return null;

    const byName: Record<string, number> = {
        Physician: 1,
        Dentist: 2,
        NursePractitioner: 3,
        NursePracticioner: 3,
        PhysiciansAssistant: 4,
        Resident: 6,
        Intern: 7,
        Psychologist: 8,
        Optometrist: 9,
        NaturopathicPhysician: 10
    };

    return byName[normalized] ?? null;
}

function isDoseSpotAddClinicianAuthorizationError(result: DoseSpotResult | undefined): boolean {
    const description = result?.ResultDescription ?? '';
    return (result?.ResultCode ?? '').toUpperCase() === 'ERROR' &&
        /Property:\s*ClinicianID\s+Details:\s*User is not authorized to do this action\.?/i.test(description);
}

function getDoseSpotAddClinicianAuthorizationMessage(): string {
    const clinicId = asNonEmptyString(process.env.DOSESPOT_CLINIC_ID);
    const userId = asNonEmptyString(process.env.DOSESPOT_USER_ID);
    return [
        'DoseSpot authenticated the current backend credentials, but the configured DoseSpot user is not authorized to add clinicians.',
        userId ? `Configured DoseSpot user: ${userId}.` : null,
        clinicId ? `Clinic: ${clinicId}.` : null,
        'DoseSpot must grant clinician-management access to that user, or you need to switch to a clinic admin/proxy admin account.'
    ].filter(Boolean).join(' ');
}

function isProviderRole(value: unknown): boolean {
    const role = normalizeRole(value);
    return Boolean(role && ['provider', 'doctor', 'clinician'].includes(role));
}

function findFirstString(source: Record<string, unknown>, keys: string[]): string | null {
    for (const key of keys) {
        const value = asNonEmptyString(source[key]);
        if (value) return value;
    }
    return null;
}

function inferClinicianSpecialtyType(value: string | null): string | null {
    if (!value) return null;

    const directMap = new Map<string, string>([
        ['allergyandimmunology', 'AllergyAndImmunology'],
        ['dermatology', 'Dermatology'],
        ['dentistry', 'Dentistry'],
        ['behavioralhealth', 'BehavioralHealth'],
        ['behavioral health', 'BehavioralHealth'],
        ['familymedicine', 'FamilyMedicine'],
        ['family medicine', 'FamilyMedicine'],
        ['internalmedicine', 'InternalMedicine'],
        ['internal medicine', 'InternalMedicine'],
        ['obstetricsandgynecology', 'ObstetricsAndGynecology'],
        ['obstetrics and gynecology', 'ObstetricsAndGynecology'],
        ['obgyn', 'ObstetricsAndGynecology'],
        ['orthopedics', 'Orthopedics'],
        ['orthopaedics', 'Orthopedics'],
        ['pediatrics', 'Pediatrics'],
        ['physicalmedicine', 'PhysicalMedicine'],
        ['physical medicine', 'PhysicalMedicine'],
        ['psychiatry', 'Psychiatry'],
        ['urology', 'Urology']
    ]);

    const normalized = value.toLowerCase().replace(/[^a-z]/g, '');
    return directMap.get(value.toLowerCase()) ?? directMap.get(normalized) ?? null;
}

function buildClinicScopedRecord(
    key: 'DEANumber' | 'NADEANumber' | 'LicenseNumber',
    value: string | null,
    state: string | null
): Record<string, unknown>[] {
    if (!value) return [];

    const record: Record<string, unknown> = {
        [key]: value
    };

    if (state) {
        record.State = state;
    }

    const clinicId = asNonEmptyString(process.env.DOSESPOT_CLINIC_ID);
    if (clinicId) {
        record.ClinicId = clinicId;
    }

    return [record];
}

function normalizeRegistrationStatus(response: unknown): string | null {
    if (typeof response === 'string') {
        return response.trim() || null;
    }

    if (!isRecord(response)) {
        return null;
    }

    return (
        pickString(response, ['Item', 'RegistrationStatus', 'Status', 'Name']) ??
        (isRecord(response.Result) ? pickString(response.Result, ['ResultDescription']) : null)
    );
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
    const [userDoc, patientDoc] = await Promise.all([
        admin.firestore().collection('users').doc(clinicianUid).get(),
        admin.firestore().collection('patients').doc(clinicianUid).get()
    ]);
    if (!userDoc.exists && !patientDoc.exists) {
        return {
            clinicianUid,
            clinicianId: null,
            storedState: {}
        };
    }

    const userData = {
        ...(patientDoc.exists ? patientDoc.data() as Record<string, unknown> : {}),
        ...(userDoc.exists ? userDoc.data() as Record<string, unknown> : {})
    };
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

async function loadClinicianSourceRecord(clinicianUid: string): Promise<Record<string, unknown>> {
    const [userDoc, patientDoc] = await Promise.all([
        admin.firestore().collection('users').doc(clinicianUid).get(),
        admin.firestore().collection('patients').doc(clinicianUid).get()
    ]);

    const userData = userDoc.exists ? userDoc.data() as Record<string, unknown> : {};
    const patientData = patientDoc.exists ? patientDoc.data() as Record<string, unknown> : {};
    const merged = {
        ...patientData,
        ...userData
    };

    if (!isProviderRole(merged.role)) {
        throw new Error('DoseSpot clinician sync is only available for provider profiles.');
    }

    return merged;
}

function buildDoseSpotClinicianPayload(
    clinicianUid: string,
    source: Record<string, unknown>
): { missingFields: string[]; payload: Record<string, unknown> } {
    const firstName = findFirstString(source, ['firstName']);
    const middleName = findFirstString(source, ['middleName']);
    const lastName = findFirstString(source, ['lastName']);
    const prefix = findFirstString(source, ['prefix']);
    const suffix = findFirstString(source, ['suffix']);
    const dateOfBirth = toOptionalIsoDateOnly(source.dateOfBirth ?? source.dob);
    const email = findFirstString(source, ['email']);
    const address1 = findFirstString(source, ['address1', 'address']);
    const address2 = findFirstString(source, ['address2']);
    const city = findFirstString(source, ['city']);
    const state = findFirstString(source, ['state']);
    const zipCode = findFirstString(source, ['zipCode', 'zip']);
    const primaryPhone = findFirstString(source, ['phone', 'primaryPhone', 'clinicPhone']);
    const primaryPhoneType = findFirstString(source, ['primaryPhoneType']) ?? 'Work';
    const primaryFax = findFirstString(source, ['primaryFax', 'clinicFax']);
    const npiNumber = findFirstString(source, ['npiNumber', 'npi']);
    const deaNumber = findFirstString(source, ['deaNumber']);
    const stateLicenseNumber = findFirstString(source, ['stateLicenseNumber']);
    const stateLicenseState = findFirstString(source, ['stateLicenseState', 'state']);
    const pdmpRoleType = normalizePdmpRoleType(findFirstString(source, ['pdmpRoleType']));
    const pdmpRoleTypeValue = mapPdmpRoleTypeToDoseSpotValue(pdmpRoleType);
    const specialty = findFirstString(source, ['clinicianSpecialtyType', 'specialty']);
    const clinicianSpecialtyType = findFirstString(source, ['clinicianSpecialtyType']) ?? inferClinicianSpecialtyType(specialty);
    const clinicianRoleTypes = toTrimmedStringArray(source.clinicianRoleTypes);
    const active = asBoolean(source.active) ?? normalizeRole(source.status) !== 'disabled';
    const epcsRequested = asBoolean(source.epcsRequested) ?? true;

    const missingFields: string[] = [];
    const required = [
        ['firstName', firstName],
        ['lastName', lastName],
        ['dateOfBirth', dateOfBirth],
        ['address1', address1],
        ['city', city],
        ['state', state],
        ['zipCode', zipCode],
        ['primaryPhone', primaryPhone],
        ['primaryFax', primaryFax],
        ['npiNumber', npiNumber],
    ] as const;

    for (const [field, value] of required) {
        if (!value) {
            missingFields.push(field);
        }
    }

    const payload: Record<string, unknown> = {
        FirstName: firstName,
        MiddleName: middleName,
        LastName: lastName,
        DateOfBirth: dateOfBirth,
        Email: email,
        Address1: address1,
        Address2: address2,
        City: city,
        State: state,
        ZipCode: zipCode,
        PrimaryPhone: primaryPhone,
        PrimaryPhoneType: primaryPhoneType,
        PrimaryFax: primaryFax,
        DEANumber: deaNumber,
        DEANumbers: buildClinicScopedRecord('DEANumber', deaNumber, stateLicenseState),
        MedicalLicenseNumbers: buildClinicScopedRecord('LicenseNumber', stateLicenseNumber, stateLicenseState),
        NPINumber: npiNumber,
        ClinicianRoleType: clinicianRoleTypes.length > 0 ? clinicianRoleTypes : ['PrescribingClinician'],
        EPCSRequested: epcsRequested,
        Active: active,
        PDMPRoleType: pdmpRoleTypeValue,
        ClinicianSpecialtyType: clinicianSpecialtyType
    };

    if (prefix) payload.Prefix = prefix;
    if (suffix) payload.Suffix = suffix;

    return {
        missingFields,
        payload: Object.fromEntries(
            Object.entries(payload).filter(([, value]) => (
                value !== null &&
                value !== undefined &&
                !(typeof value === 'string' && value.trim().length === 0) &&
                !(Array.isArray(value) && value.length === 0)
            ))
        )
    };
}

async function persistClinicianSyncSnapshot(
    clinicianUid: string,
    patch: {
        clinicianId?: number | null;
        synced?: boolean;
        registrationStatus?: string | null;
        lastSyncError?: string | null;
    }
): Promise<void> {
    const now = new Date();
    const updates: Record<string, unknown> = {
        'doseSpot.lastSyncAt': now,
        updatedAt: now
    };

    if (patch.clinicianId !== undefined && patch.clinicianId !== null) {
        updates.doseSpotClinicianId = patch.clinicianId;
    }
    if (patch.synced !== undefined) {
        updates['doseSpot.synced'] = patch.synced;
    }
    if (patch.registrationStatus !== undefined) {
        updates['doseSpot.registrationStatus'] = patch.registrationStatus;
        updates['doseSpot.registrationStatusCheckedAt'] = now;
    }
    if (patch.lastSyncError !== undefined) {
        updates['doseSpot.lastSyncError'] = patch.lastSyncError;
    }

    await Promise.all([
        admin.firestore().collection('users').doc(clinicianUid).set(updates, { merge: true }),
        admin.firestore().collection('patients').doc(clinicianUid).set(updates, { merge: true })
    ]);
}

export async function getDoseSpotClinicianReadinessForUid(clinicianUid: string): Promise<DoseSpotClinicianReadiness> {
    return buildStoredReadiness(clinicianUid);
}

export async function fetchDoseSpotClinicianRegistrationStatusForUid(
    clinicianUid: string
): Promise<DoseSpotClinicianRegistrationStatusResponse> {
    const context = await requireClinicianContext(clinicianUid);
    const response = await doseSpotApiFetch<Record<string, unknown> | unknown[]>(
        `api/clinicians/${context.clinicianId}/registrationStatus`,
        {
            method: 'GET',
            onBehalfOfClinicianId: context.clinicianId
        }
    );

    if (isRecord(response) && isRecord(response.Result)) {
        ensureDoseSpotResultOk(response.Result as DoseSpotResult, 'registration status');
    }

    const registrationStatus = normalizeRegistrationStatus(response);
    await persistClinicianSyncSnapshot(clinicianUid, {
        clinicianId: context.clinicianId,
        synced: true,
        registrationStatus,
        lastSyncError: null
    });

    return {
        clinicianUid,
        clinicianId: context.clinicianId,
        registrationStatus,
        synced: true,
        rawResponse: toResponseObject(response),
        message: registrationStatus
            ? `DoseSpot registration status: ${registrationStatus}.`
            : 'DoseSpot did not return a clinician registration status.'
    };
}

export async function syncDoseSpotClinicianForUid(
    clinicianUid: string
): Promise<DoseSpotClinicianSyncResponse> {
    const existingContext = await loadClinicianContext(clinicianUid);
    if (existingContext.clinicianId) {
        const status = await fetchDoseSpotClinicianRegistrationStatusForUid(clinicianUid);
        return {
            clinicianUid,
            clinicianId: status.clinicianId,
            synced: true,
            registrationStatus: status.registrationStatus,
            missingFields: [],
            rawResponse: status.rawResponse,
            message: 'Provider is already linked to DoseSpot.'
        };
    }

    const source = await loadClinicianSourceRecord(clinicianUid);
    const { missingFields, payload } = buildDoseSpotClinicianPayload(clinicianUid, source);

    if (missingFields.length > 0) {
        await persistClinicianSyncSnapshot(clinicianUid, {
            synced: false,
            lastSyncError: `Missing required fields: ${missingFields.join(', ')}`
        });

        return {
            clinicianUid,
            clinicianId: null,
            synced: false,
            registrationStatus: null,
            missingFields,
            message: 'Provider profile is missing required DoseSpot clinician fields.'
        };
    }

    const response = await doseSpotApiFetch<Record<string, unknown> | unknown[]>(
        'api/clinicians',
        {
            method: 'POST',
            body: payload
        }
    );

    if (isRecord(response) && isRecord(response.Result)) {
        const result = response.Result as DoseSpotResult;
        if (isDoseSpotAddClinicianAuthorizationError(result)) {
            const message = getDoseSpotAddClinicianAuthorizationMessage();
            await persistClinicianSyncSnapshot(clinicianUid, {
                synced: false,
                lastSyncError: message
            });
            throw new Error(message);
        }

        ensureDoseSpotResultOk(result, 'add clinician');
    }

    const clinicianId = Array.isArray(response)
        ? null
        : asNumber(response.Id ?? response.id ?? response.ClinicianId ?? response.clinicianId ?? response.Item);

    if (!clinicianId) {
        throw new Error('DoseSpot did not return a clinician ID after creating the clinician.');
    }

    await persistClinicianSyncSnapshot(clinicianUid, {
        clinicianId,
        synced: true,
        lastSyncError: null
    });

    const status = await fetchDoseSpotClinicianRegistrationStatusForUid(clinicianUid);

    return {
        clinicianUid,
        clinicianId,
        synced: true,
        registrationStatus: status.registrationStatus,
        missingFields: [],
        rawResponse: toResponseObject(response),
        message: 'Provider synced to DoseSpot successfully.'
    };
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
