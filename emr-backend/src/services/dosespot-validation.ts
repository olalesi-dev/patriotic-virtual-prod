import * as admin from 'firebase-admin';
import { generateSSOUrl } from '../utils/dosespot';
import {
    fetchDoseSpotMedicationHistoryForPatientUid,
    fetchDoseSpotPendingRefillsQueue,
    fetchDoseSpotPendingRxChangesQueue,
    fetchDoseSpotPrescriptionSummaryForPatientUid
} from './dosespot-workflows';
import { ensureDoseSpotPatientForUid } from './dosespot-patients';
import { getDoseSpotWebhookValidationReport, type DoseSpotWebhookValidationReport } from './dosespot-push';

export type DoseSpotValidationCheckStatus = 'pass' | 'fail' | 'skip';

export interface DoseSpotValidationCheck {
    key: string;
    title: string;
    status: DoseSpotValidationCheckStatus;
    detail: string;
}

export interface DoseSpotValidationSummary {
    total: number;
    passed: number;
    failed: number;
    skipped: number;
}

export interface DoseSpotValidationRunResult {
    runId: string;
    requesterUid: string;
    requesterClinicianId: number | null;
    patientUid: string | null;
    clinicId: 'Current' | 'All';
    checks: DoseSpotValidationCheck[];
    summary: DoseSpotValidationSummary;
    webhookValidation: DoseSpotWebhookValidationReport | null;
    createdAt: string;
}

export interface DoseSpotValidationRunInput {
    requesterUid: string;
    requesterClinicianId: number | null;
    patientUid?: string;
    clinicId?: 'Current' | 'All';
}

function asNumber(value: unknown): number {
    if (typeof value === 'number' && Number.isFinite(value)) return value;
    if (typeof value === 'string') {
        const parsed = Number.parseInt(value, 10);
        return Number.isFinite(parsed) ? parsed : 0;
    }
    return 0;
}

function toErrorMessage(error: unknown): string {
    return error instanceof Error ? error.message : String(error);
}

function computeSummary(checks: DoseSpotValidationCheck[]): DoseSpotValidationSummary {
    return {
        total: checks.length,
        passed: checks.filter((check) => check.status === 'pass').length,
        failed: checks.filter((check) => check.status === 'fail').length,
        skipped: checks.filter((check) => check.status === 'skip').length
    };
}

export async function runDoseSpotScreenDemoValidation(
    input: DoseSpotValidationRunInput
): Promise<DoseSpotValidationRunResult> {
    const checks: DoseSpotValidationCheck[] = [];
    const patientUid = typeof input.patientUid === 'string' && input.patientUid.trim().length > 0
        ? input.patientUid.trim()
        : null;
    const clinicId = input.clinicId === 'All' ? 'All' : 'Current';
    const clinicianId = input.requesterClinicianId;
    const onBehalfOfClinicianId = clinicianId ?? undefined;
    let webhookValidation: DoseSpotWebhookValidationReport | null = null;

    if (!patientUid) {
        checks.push({
            key: 'sso-patient',
            title: 'SSO patient launch URL ready',
            status: 'skip',
            detail: 'Skipped. Provide a patient UID to validate patient-chart SSO.'
        });
    } else if (!clinicianId) {
        checks.push({
            key: 'sso-patient',
            title: 'SSO patient launch URL ready',
            status: 'fail',
            detail: 'Current user is missing doseSpotClinicianId, so patient SSO cannot be generated.'
        });
    } else {
        try {
            const ensuredPatient = await ensureDoseSpotPatientForUid(patientUid, {
                updateExisting: false,
                onBehalfOfClinicianId
            });

            if (ensuredPatient.syncStatus !== 'ready' || !ensuredPatient.doseSpotPatientId) {
                checks.push({
                    key: 'sso-patient',
                    title: 'SSO patient launch URL ready',
                    status: 'fail',
                    detail: ensuredPatient.message
                });
            } else {
                generateSSOUrl({
                    clinicianDoseSpotId: clinicianId,
                    patientDoseSpotId: ensuredPatient.doseSpotPatientId
                });
                checks.push({
                    key: 'sso-patient',
                    title: 'SSO patient launch URL ready',
                    status: 'pass',
                    detail: 'Patient SSO URL generated.'
                });
            }
        } catch (error) {
            checks.push({
                key: 'sso-patient',
                title: 'SSO patient launch URL ready',
                status: 'fail',
                detail: toErrorMessage(error)
            });
        }
    }

    if (!clinicianId) {
        checks.push({
            key: 'sso-queue',
            title: 'SSO refills/errors launch URL ready',
            status: 'fail',
            detail: 'Current user is missing doseSpotClinicianId, so refills/errors SSO cannot be generated.'
        });
    } else {
        try {
            generateSSOUrl({
                clinicianDoseSpotId: clinicianId,
                refillsErrors: true
            });
            checks.push({
                key: 'sso-queue',
                title: 'SSO refills/errors launch URL ready',
                status: 'pass',
                detail: 'Refills/errors SSO URL generated.'
            });
        } catch (error) {
            checks.push({
                key: 'sso-queue',
                title: 'SSO refills/errors launch URL ready',
                status: 'fail',
                detail: toErrorMessage(error)
            });
        }
    }

    if (!patientUid) {
        checks.push({
            key: 'med-history',
            title: 'Medication history endpoint returns',
            status: 'skip',
            detail: 'Skipped. Provide a patient UID to validate medication history.'
        });
    } else {
        try {
            const response = await fetchDoseSpotMedicationHistoryForPatientUid(patientUid, {
                onBehalfOfClinicianId
            });
            checks.push({
                key: 'med-history',
                title: 'Medication history endpoint returns',
                status: response.syncStatus === 'ready' ? 'pass' : 'fail',
                detail: response.syncStatus === 'ready'
                    ? `Medication history call succeeded (${response.items.length} item(s) returned).`
                    : response.message
            });
        } catch (error) {
            checks.push({
                key: 'med-history',
                title: 'Medication history endpoint returns',
                status: 'fail',
                detail: toErrorMessage(error)
            });
        }
    }

    if (!patientUid) {
        checks.push({
            key: 'eligibility',
            title: 'Eligibility summary endpoint returns',
            status: 'skip',
            detail: 'Skipped. Provide a patient UID to validate eligibility summary.'
        });
    } else {
        try {
            const response = await fetchDoseSpotPrescriptionSummaryForPatientUid(patientUid, {
                onBehalfOfClinicianId
            });
            checks.push({
                key: 'eligibility',
                title: 'Eligibility summary endpoint returns',
                status: response.syncStatus === 'ready' ? 'pass' : 'fail',
                detail: response.syncStatus === 'ready'
                    ? `Prescription summary succeeded (${response.eligibility.totalWithEligibilityId} with eligibility IDs).`
                    : response.message
            });
        } catch (error) {
            checks.push({
                key: 'eligibility',
                title: 'Eligibility summary endpoint returns',
                status: 'fail',
                detail: toErrorMessage(error)
            });
        }
    }

    try {
        const response = await fetchDoseSpotPendingRefillsQueue({
            clinicId,
            patientUid: patientUid ?? undefined,
            onBehalfOfClinicianId
        });
        checks.push({
            key: 'refills-queue',
            title: 'Refills queue endpoint returns',
            status: response.syncStatus === 'ready' ? 'pass' : 'fail',
            detail: response.syncStatus === 'ready'
                ? `Refills queue endpoint succeeded (${response.totalItems} total item(s)).`
                : response.message
        });
    } catch (error) {
        checks.push({
            key: 'refills-queue',
            title: 'Refills queue endpoint returns',
            status: 'fail',
            detail: toErrorMessage(error)
        });
    }

    try {
        const response = await fetchDoseSpotPendingRxChangesQueue({
            clinicId,
            patientUid: patientUid ?? undefined,
            onBehalfOfClinicianId
        });
        checks.push({
            key: 'rxchange-queue',
            title: 'RxChange queue endpoint returns',
            status: response.syncStatus === 'ready' ? 'pass' : 'fail',
            detail: response.syncStatus === 'ready'
                ? `RxChange queue endpoint succeeded (${response.totalItems} total item(s)).`
                : response.message
        });
    } catch (error) {
        checks.push({
            key: 'rxchange-queue',
            title: 'RxChange queue endpoint returns',
            status: 'fail',
            detail: toErrorMessage(error)
        });
    }

    try {
        const snapshot = await admin.firestore()
            .collection('users')
            .doc(input.requesterUid)
            .collection('dosespot')
            .doc('notifications')
            .get();
        const data = snapshot.data() as Record<string, unknown> | undefined;
        const total = data
            ? asNumber(data.total) || (
                asNumber(data.pendingPrescriptions) +
                asNumber(data.transmissionErrors) +
                asNumber(data.refillRequests) +
                asNumber(data.changeRequests)
            )
            : 0;
        checks.push({
            key: 'notifications',
            title: 'Notification count endpoint returns',
            status: 'pass',
            detail: `Notification count endpoint succeeded (current total ${total}).`
        });
    } catch (error) {
        checks.push({
            key: 'notifications',
            title: 'Notification count endpoint returns',
            status: 'fail',
            detail: toErrorMessage(error)
        });
    }

    try {
        webhookValidation = await getDoseSpotWebhookValidationReport();
        checks.push({
            key: 'webhook-outbound',
            title: 'DoseSpot outbound webhook delivery observed',
            status: webhookValidation.validated ? 'pass' : 'fail',
            detail: webhookValidation.validated
                ? webhookValidation.message
                : `${webhookValidation.message} Event types seen: ${webhookValidation.observedEventTypes.join(', ') || 'none'}.`
        });
    } catch (error) {
        checks.push({
            key: 'webhook-outbound',
            title: 'DoseSpot outbound webhook delivery observed',
            status: 'fail',
            detail: toErrorMessage(error)
        });
    }

    const summary = computeSummary(checks);
    const now = new Date();
    const runRef = admin.firestore()
        .collection('users')
        .doc(input.requesterUid)
        .collection('dosespotValidationRuns')
        .doc();

    await runRef.set({
        requesterUid: input.requesterUid,
        requesterClinicianId: clinicianId,
        patientUid,
        clinicId,
        checks,
        summary,
        webhookValidation,
        createdAt: now,
        updatedAt: now
    }, { merge: true });

    return {
        runId: runRef.id,
        requesterUid: input.requesterUid,
        requesterClinicianId: clinicianId,
        patientUid,
        clinicId,
        checks,
        summary,
        webhookValidation,
        createdAt: now.toISOString()
    };
}
