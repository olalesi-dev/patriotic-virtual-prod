import { dosespotConfig } from './utils';
import { doseSpotApiFetch, ensureDoseSpotResultOk } from './api';

export type DoseSpotSyncStatus =
  | 'ready'
  | 'pending_retry'
  | 'ambiguous_match'
  | 'blocked'
  | 'pending';

export interface DoseSpotPatientRecord {
  PatientId?: number;
  FirstName?: string;
  LastName?: string;
  DateOfBirth?: string;
  Gender?: string;
  Email?: string;
  Address1?: string;
  Address2?: string;
  City?: string;
  State?: string;
  ZipCode?: string;
  PrimaryPhone?: string;
  NonDoseSpotMedicalRecordNumber?: string;
  Active?: boolean;
}

export interface DoseSpotAddEditPatientRequest {
  FirstName: string;
  LastName: string;
  DateOfBirth: string;
  Gender: 'Male' | 'Female' | 'Unknown';
  Email?: string;
  Address1: string;
  Address2?: string;
  City: string;
  State: string;
  ZipCode: string;
  PrimaryPhone: string;
  PrimaryPhoneType: string;
  NonDoseSpotMedicalRecordNumber: string;
  Active: boolean;
}

export interface SyncPatientInput {
  firstName: string;
  lastName: string;
  dateOfBirth: string;
  gender: string;
  email?: string;
  address1: string;
  address2?: string;
  city: string;
  state: string;
  zipCode: string;
  phone: string;
  mrn: string;
  existingDoseSpotPatientId?: string;
}

export interface SyncPatientResult {
  doseSpotPatientId?: string;
  syncStatus: DoseSpotSyncStatus;
  syncError?: string;
  matchSource?: 'existing' | 'search_exact' | 'created';
}

function normalizeGender(value?: string): 'Male' | 'Female' | 'Unknown' {
  if (!value) return 'Unknown';
  const v = value.toLowerCase();
  if (v === 'male' || v === 'm') return 'Male';
  if (v === 'female' || v === 'f') return 'Female';
  return 'Unknown';
}

function normalizePhone(value?: string): string {
  if (!value) return '';
  return value.replace(/\D/g, '').slice(-10);
}

function normalizeZip(value?: string): string {
  if (!value) return '';
  return value.replace(/\D/g, '').slice(0, 5);
}

export async function syncDoseSpotPatient(
  input: SyncPatientInput,
  options: { onBehalfOfClinicianId?: number } = {},
): Promise<SyncPatientResult> {
  const clinicianId =
    options.onBehalfOfClinicianId ??
    Number(dosespotConfig.userId); // System user fallback

  const searchResults = await doseSpotApiFetch<{ Items?: DoseSpotPatientRecord[] }>(
    'api/patients/search',
    {
      method: 'POST',
      body: {
        FirstName: input.firstName,
        LastName: input.lastName,
        DateOfBirth: input.dateOfBirth,
      },
      onBehalfOfClinicianId: clinicianId,
    },
  );

  const items = searchResults.Items ?? [];
  const normalizedPhone = normalizePhone(input.phone);

  const exactMatches = items.filter((item) => {
    const itemPhone = normalizePhone(item.PrimaryPhone);
    return itemPhone === normalizedPhone || !item.PrimaryPhone;
  });

  if (exactMatches.length === 1) {
    const match = exactMatches[0];
    return {
      doseSpotPatientId: match.PatientId?.toString(),
      syncStatus: 'ready',
      matchSource: 'search_exact',
    };
  }

  if (exactMatches.length > 1) {
    return {
      syncStatus: 'ambiguous_match',
      syncError: `Multiple patients found in DoseSpot with same demographics. IDs: ${exactMatches
        .map((m) => m.PatientId)
        .join(', ')}`,
    };
  }

  // No match found, create new
  const payload: DoseSpotAddEditPatientRequest = {
    FirstName: input.firstName,
    LastName: input.lastName,
    DateOfBirth: input.dateOfBirth,
    Gender: normalizeGender(input.gender),
    Email: input.email,
    Address1: input.address1,
    Address2: input.address2,
    City: input.city,
    State: input.state,
    ZipCode: normalizeZip(input.zipCode),
    PrimaryPhone: normalizedPhone,
    PrimaryPhoneType: 'Cell',
    NonDoseSpotMedicalRecordNumber: input.mrn,
    Active: true,
  };

  try {
    const createResult = await doseSpotApiFetch<{ Id?: number }>(
      'api/patients',
      {
        method: 'POST',
        body: payload,
        onBehalfOfClinicianId: clinicianId,
      },
    );

    return {
      doseSpotPatientId: createResult.Id?.toString(),
      syncStatus: 'ready',
      matchSource: 'created',
    };
  } catch (error: any) {
    return {
      syncStatus: 'pending_retry',
      syncError: error.message,
    };
  }
}
