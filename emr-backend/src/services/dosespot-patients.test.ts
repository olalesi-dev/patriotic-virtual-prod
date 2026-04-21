import test from 'node:test';
import assert from 'node:assert/strict';
import { doseSpotPatientTestables } from './dosespot-patients';

process.env.DOSESPOT_DEFAULT_CLINICIAN_ID = process.env.DOSESPOT_DEFAULT_CLINICIAN_ID ?? '445566';

function withEnv<T>(name: string, value: string | undefined, run: () => Promise<T> | T): Promise<T> | T {
    const previous = process.env[name];

    if (value === undefined) {
        delete process.env[name];
    } else {
        process.env[name] = value;
    }

    try {
        return run();
    } finally {
        if (previous === undefined) {
            delete process.env[name];
        } else {
            process.env[name] = previous;
        }
    }
}

function buildSource(overrides: Record<string, unknown> = {}) {
    return {
        patientUid: 'patient-1',
        firstName: 'Rowena',
        lastName: 'Acacianna',
        dateOfBirth: '1991-04-09',
        gender: 'Female' as const,
        email: 'rowena@example.com',
        address1: '123 Main St',
        address2: null,
        city: 'Boston',
        state: 'MA',
        zipCode: '02118',
        primaryPhone: '6175551212',
        mrn: 'MRN-001',
        existingDoseSpotPatientId: null,
        retryCount: 0,
        preferredPharmacy: null,
        preferredPharmacyDoseSpotId: null,
        preferredPharmacySyncStatus: null,
        preferredPharmacySyncedDoseSpotId: null,
        preferredPharmacySyncedPatientId: null,
        ...overrides
    };
}

function buildGateway(overrides: Partial<{
    searchPatients: (...args: any[]) => Promise<any[]>;
    addPatient: (...args: any[]) => Promise<number>;
    editPatient: (...args: any[]) => Promise<number>;
    getPatient: (...args: any[]) => Promise<any>;
    addPatientPharmacy: (...args: any[]) => Promise<void>;
}> = {}) {
    return {
        searchPatients: async () => [],
        addPatient: async () => 501,
        editPatient: async (patientId: number) => patientId,
        getPatient: async () => null,
        addPatientPharmacy: async () => undefined,
        ...overrides
    };
}

test('ensureDoseSpotPatientWithSource reuses a single exact DoseSpot search hit', async () => {
    const persisted: Array<Record<string, unknown>> = [];
    const result = await doseSpotPatientTestables.ensureDoseSpotPatientWithSource(
        buildSource(),
        {},
        buildGateway({
            searchPatients: async () => [{
                PatientId: 412,
                FirstName: 'Rowena',
                LastName: 'Acacianna',
                DateOfBirth: '1991-04-09T00:00:00.000Z'
            }]
        }),
        async (input) => { persisted.push(input as unknown as Record<string, unknown>); }
    );

    assert.equal(result.status, 'linked_existing');
    assert.equal(result.syncStatus, 'ready');
    assert.equal(result.doseSpotPatientId, 412);
    assert.deepEqual(result.candidatePatientIds, [412]);
    assert.equal(persisted[0]?.doseSpotPatientId, 412);
    assert.equal(persisted[0]?.syncStatus, 'ready');
});

test('ensureDoseSpotPatientWithSource creates a new DoseSpot patient when search is empty', async () => {
    const result = await doseSpotPatientTestables.ensureDoseSpotPatientWithSource(
        buildSource(),
        {},
        buildGateway({
            addPatient: async () => 777
        }),
        async () => undefined
    );

    assert.equal(result.status, 'created_new');
    assert.equal(result.syncStatus, 'ready');
    assert.equal(result.doseSpotPatientId, 777);
});

test('resolveDoseSpotPatientOperationClinicianId prefers explicit clinician ids and otherwise uses DOSESPOT_DEFAULT_CLINICIAN_ID', async () => {
    await withEnv('DOSESPOT_DEFAULT_CLINICIAN_ID', '445566', async () => {
        assert.equal(doseSpotPatientTestables.resolveDoseSpotPatientOperationClinicianId(778899), 778899);
        assert.equal(doseSpotPatientTestables.resolveDoseSpotPatientOperationClinicianId(undefined), 445566);
    });
});

test('ensureDoseSpotPatientWithSource uses DOSESPOT_DEFAULT_CLINICIAN_ID when no provider clinician context is supplied', async () => {
    await withEnv('DOSESPOT_DEFAULT_CLINICIAN_ID', '445566', async () => {
        let searchClinicianId: number | undefined;
        let addClinicianId: number | undefined;

        const result = await doseSpotPatientTestables.ensureDoseSpotPatientWithSource(
            buildSource(),
            {},
            buildGateway({
                searchPatients: async (_params: unknown, onBehalfOfClinicianId?: number) => {
                    searchClinicianId = onBehalfOfClinicianId;
                    return [];
                },
                addPatient: async (_payload: unknown, onBehalfOfClinicianId?: number) => {
                    addClinicianId = onBehalfOfClinicianId;
                    return 777;
                }
            }),
            async () => undefined
        );

        assert.equal(result.status, 'created_new');
        assert.equal(searchClinicianId, 445566);
        assert.equal(addClinicianId, 445566);
    });
});

test('ensureDoseSpotPatientWithSource blocks when no provider clinician context or default clinician env is configured', async () => {
    await withEnv('DOSESPOT_DEFAULT_CLINICIAN_ID', undefined, async () => {
        let searchCalled = false;

        const result = await doseSpotPatientTestables.ensureDoseSpotPatientWithSource(
            buildSource(),
            {},
            buildGateway({
                searchPatients: async () => {
                    searchCalled = true;
                    return [];
                }
            }),
            async () => undefined
        );

        assert.equal(result.status, 'blocked');
        assert.equal(result.syncStatus, 'blocked');
        assert.equal(searchCalled, false);
        assert.equal(result.lastError, doseSpotPatientTestables.getDoseSpotPatientClinicianContextError());
    });
});

test('ensureDoseSpotPatientWithSource blocks patient creation when DoseSpot-required address or phone fields are missing', async () => {
    let addCalled = false;

    const result = await doseSpotPatientTestables.ensureDoseSpotPatientWithSource(
        buildSource({ address1: null, city: null, state: null, zipCode: null, primaryPhone: null }),
        {},
        buildGateway({
            addPatient: async () => {
                addCalled = true;
                return 777;
            }
        }),
        async () => undefined
    );

    assert.equal(result.status, 'blocked');
    assert.equal(result.syncStatus, 'blocked');
    assert.deepEqual(result.missingFields, ['address1', 'city', 'state', 'zipCode', 'primaryPhone']);
    assert.match(result.message, /patient creation requires address1, city, state, zipCode, and primaryPhone/i);
    assert.equal(addCalled, false);
});

test('ensureDoseSpotPatientWithSource updates an already linked patient when requested', async () => {
    const persisted: Array<Record<string, unknown>> = [];
    let editedPatientId: number | null = null;

    const result = await doseSpotPatientTestables.ensureDoseSpotPatientWithSource(
        buildSource({ existingDoseSpotPatientId: 903 }),
        { updateExisting: true },
        buildGateway({
            editPatient: async (patientId: number) => {
                editedPatientId = patientId;
                return patientId;
            }
        }),
        async (input) => { persisted.push(input as unknown as Record<string, unknown>); }
    );

    assert.equal(editedPatientId, 903);
    assert.equal(result.status, 'updated_existing');
    assert.equal(result.syncStatus, 'ready');
    assert.equal(result.doseSpotPatientId, 903);
    assert.equal(persisted[0]?.retryCount, 0);
});

test('ensureDoseSpotPatientWithSource blocks on ambiguous search matches', async () => {
    let addCalled = false;

    const result = await doseSpotPatientTestables.ensureDoseSpotPatientWithSource(
        buildSource(),
        {},
        buildGateway({
            searchPatients: async () => [
                {
                    PatientId: 101,
                    FirstName: 'Rowena',
                    LastName: 'Acacianna',
                    DateOfBirth: '1991-04-09T00:00:00.000Z'
                },
                {
                    PatientId: 202,
                    FirstName: 'Rowena',
                    LastName: 'Acacianna',
                    DateOfBirth: '1991-04-09T00:00:00.000Z'
                }
            ],
            addPatient: async () => {
                addCalled = true;
                return 303;
            }
        }),
        async () => undefined
    );

    assert.equal(result.status, 'ambiguous_match');
    assert.equal(result.syncStatus, 'ambiguous_match');
    assert.deepEqual(result.candidatePatientIds, [101, 202]);
    assert.equal(addCalled, false);
});

test('ensureDoseSpotPatientWithSource converts transient DoseSpot failures into pending_retry', async () => {
    const persisted: Array<Record<string, unknown>> = [];
    const result = await doseSpotPatientTestables.ensureDoseSpotPatientWithSource(
        buildSource({ retryCount: 2 }),
        {},
        buildGateway({
            searchPatients: async () => {
                throw new Error('503 upstream');
            }
        }),
        async (input) => { persisted.push(input as unknown as Record<string, unknown>); }
    );

    assert.equal(result.status, 'pending_retry');
    assert.equal(result.syncStatus, 'pending_retry');
    assert.equal(result.doseSpotPatientId, null);
    assert.equal(result.lastError, '503 upstream');
    assert.equal(persisted[0]?.retryCount, 3);
    assert.equal(persisted[0]?.lastError, '503 upstream');
});

test('ensureDoseSpotPatientWithSource treats DoseSpot operation-group authorization failures as blocked', async () => {
    const persisted: Array<Record<string, unknown>> = [];
    const result = await doseSpotPatientTestables.ensureDoseSpotPatientWithSource(
        buildSource(),
        {},
        buildGateway({
            searchPatients: async () => {
                throw new Error('DoseSpot API GET api/patients/search failed: 401 Unauthorized - {"Message":"Authorization has been denied based on configured operation group."}');
            }
        }),
        async (input) => { persisted.push(input as unknown as Record<string, unknown>); }
    );

    assert.equal(result.status, 'blocked');
    assert.equal(result.syncStatus, 'blocked');
    assert.equal(result.doseSpotPatientId, null);
    assert.match(result.message, /patient operations are not enabled/i);
    assert.equal(persisted[0]?.retryCount, 0);
});

test('deleteDoseSpotPatientWithSource deactivates a linked DoseSpot patient and clears local sync state', async () => {
    const clearedPatientUids: string[] = [];
    let editedPayload: Record<string, unknown> | null = null;

    const result = await doseSpotPatientTestables.deleteDoseSpotPatientWithSource(
        buildSource({ existingDoseSpotPatientId: 82368444 }),
        {},
        buildGateway({
            getPatient: async () => ({
                PatientId: 82368444,
                FirstName: 'Rowena',
                LastName: 'Acacianna',
                DateOfBirth: '1968-03-29T00:00:00.000Z',
                Gender: 'Female',
                Address1: '2798 Parsifal St NE',
                City: 'Albuquerque',
                State: 'NM',
                ZipCode: '87112',
                PrimaryPhone: '5052936547',
                PrimaryPhoneType: 'Cell',
                NonDoseSpotMedicalRecordNumber: 'cert-rowena-19680329',
                Active: true
            }),
            editPatient: async (_patientId: number, payload: Record<string, unknown>) => {
                editedPayload = payload;
                return 82368444;
            }
        }),
        async (patientUid) => { clearedPatientUids.push(patientUid); }
    );

    assert.equal(result.status, 'deleted');
    assert.deepEqual(result.deletedPatientIds, [82368444]);
    assert.equal((editedPayload as Record<string, unknown> | null)?.Active, false);
    assert.deepEqual(clearedPatientUids, ['patient-1']);
});

test('deleteDoseSpotPatientWithSource returns ambiguous_match when multiple exact matches exist and explicit confirmation was not provided', async () => {
    const result = await doseSpotPatientTestables.deleteDoseSpotPatientWithSource(
        buildSource(),
        {},
        buildGateway({
            searchPatients: async () => [
                {
                    PatientId: 82368444,
                    FirstName: 'Rowena',
                    LastName: 'Acacianna',
                    DateOfBirth: '1991-04-09T00:00:00.000Z'
                },
                {
                    PatientId: 82368454,
                    FirstName: 'Rowena',
                    LastName: 'Acacianna',
                    DateOfBirth: '1991-04-09T00:00:00.000Z'
                }
            ]
        }),
        async () => undefined
    );

    assert.equal(result.status, 'ambiguous_match');
    assert.deepEqual(result.candidatePatientIds, [82368444, 82368454]);
    assert.deepEqual(result.deletedPatientIds, []);
});

test('ensureDoseSpotPatientWithSource syncs preferred pharmacy when DoseSpot pharmacy id is present', async () => {
    const pharmacyCalls: Array<{ patientId: number; pharmacyId: number; setAsPrimary: boolean }> = [];

    const result = await doseSpotPatientTestables.ensureDoseSpotPatientWithSource(
        buildSource({
            existingDoseSpotPatientId: 903,
            preferredPharmacyDoseSpotId: 445566,
            preferredPharmacy: 'Demo Pharmacy'
        }),
        {},
        buildGateway({
            addPatientPharmacy: async (patientId: number, payload: { pharmacyId: number; setAsPrimary: boolean }) => {
                pharmacyCalls.push({ patientId, pharmacyId: payload.pharmacyId, setAsPrimary: payload.setAsPrimary });
            }
        }),
        async () => undefined
    );

    assert.equal(result.status, 'already_linked');
    assert.equal(result.syncStatus, 'ready');
    assert.equal(pharmacyCalls.length, 1);
    assert.deepEqual(pharmacyCalls[0], { patientId: 903, pharmacyId: 445566, setAsPrimary: true });
    assert.match(result.message, /Preferred pharmacy synced to DoseSpot/i);
});
