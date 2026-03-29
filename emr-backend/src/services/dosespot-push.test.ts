import test from 'node:test';
import assert from 'node:assert/strict';
import { doseSpotTestables } from './dosespot-push';

test('computeDedupeKey is stable for identical payloads', () => {
    const payload = {
        EventType: 'PrescriptionResult',
        Data: {
            ClinicianId: 123,
            PatientId: 456,
            PrescriptionId: 789,
            StatusDetails: 'Unable to connect to remote server'
        }
    };

    const first = doseSpotTestables.computeDedupeKey(payload);
    const second = doseSpotTestables.computeDedupeKey(payload);

    assert.equal(first, second);
});

test('buildNormalizedEvent flags critical counts and emits a notification', () => {
    const payload = {
        EventType: 'PrescriberNotificationCounts',
        Data: {
            ClinicianId: 123,
            Total: {
                PendingPrescriptionCount: 2,
                TransmissionErrorCount: 1,
                RefillRequestCount: 0,
                ChangeRequestCount: 0
            }
        }
    };

    const normalized = doseSpotTestables.buildNormalizedEvent(payload, null, {
        pendingPrescriptions: 0,
        transmissionErrors: 0,
        refillRequests: 0,
        changeRequests: 0,
        total: 0
    });

    assert.equal(normalized.internalType, 'RX_COUNTS_CHANGED');
    assert.equal(normalized.notification?.type, 'dosespot_rx_counts');
    assert.equal(normalized.notification?.priority, 'high');
    assert.equal(normalized.notification?.sendPush, true);
    assert.equal(normalized.notification?.href, '/orders/erx?refillsErrors=true');
    assert.equal(normalized.counts?.total, 3);
});

test('buildNormalizedEvent maps prescription errors to high-priority DoseSpot alerts', () => {
    const payload = {
        EventType: 'PrescriptionResult',
        Data: {
            ClinicianId: 123,
            PatientId: 456,
            PrescriptionId: 789,
            PrescriptionStatus: 13,
            StatusDetails: 'Unable to connect to remote server'
        }
    };

    const normalized = doseSpotTestables.buildNormalizedEvent(payload, null, {
        pendingPrescriptions: 0,
        transmissionErrors: 0,
        refillRequests: 0,
        changeRequests: 0,
        total: 0
    });

    assert.equal(normalized.internalType, 'RX_FINAL_STATUS_CHANGED');
    assert.equal(normalized.notification?.type, 'dosespot_rx_error');
    assert.equal(normalized.notification?.sendPush, true);
    assert.equal(normalized.notification?.href, '/orders/erx?refillsErrors=true');
});

test('buildNormalizedEvent routes clinician security events to readiness', () => {
    const payload = {
        EventType: 'ClinicianLockedOut',
        Data: {
            ClinicianId: 123
        }
    };

    const normalized = doseSpotTestables.buildNormalizedEvent(payload, null, {
        pendingPrescriptions: 0,
        transmissionErrors: 0,
        refillRequests: 0,
        changeRequests: 0,
        total: 0
    });

    assert.equal(normalized.internalType, 'CLINICIAN_SECURITY_EVENT');
    assert.equal(normalized.notification?.type, 'dosespot_clinician_security');
    assert.equal(normalized.notification?.href, '/orders/erx/readiness');
});

test('buildNormalizedEvent routes medication updates to the patient chart when patient context exists', () => {
    const payload = {
        EventType: 'MedicationStatusUpdate',
        Data: {
            ClinicianId: 123,
            PatientId: 456,
            MedicationStatus: 11
        }
    };

    const normalized = doseSpotTestables.buildNormalizedEvent(payload, 'patient-abc', {
        pendingPrescriptions: 0,
        transmissionErrors: 0,
        refillRequests: 0,
        changeRequests: 0,
        total: 0
    });

    assert.equal(normalized.internalType, 'MEDICATION_STATUS_CHANGED');
    assert.equal(normalized.notification?.type, 'dosespot_medication_status');
    assert.equal(normalized.notification?.href, '/patients/patient-abc');
});
