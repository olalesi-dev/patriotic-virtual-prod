import { db } from '../../db';
import * as schema from '@workspace/db/schema';
import { eq } from 'drizzle-orm';
import { syncDoseSpotPatient, type SyncPatientInput } from '@workspace/dosespot/patient-sync';

export async function ensurePatientSynced(patientId: string, onBehalfOfClinicianId?: number) {
  const [patient] = await db
    .select()
    .from(schema.patients)
    .where(eq(schema.patients.id, patientId))
    .limit(1);

  if (!patient) {
    throw new Error('Patient not found');
  }

  // Check if all required fields are present
  const missingFields = [];
  if (!patient.firstName) missingFields.push('firstName');
  if (!patient.lastName) missingFields.push('lastName');
  if (!patient.dateOfBirth) missingFields.push('dateOfBirth');
  if (!patient.address1) missingFields.push('address1');
  if (!patient.city) missingFields.push('city');
  if (!patient.state) missingFields.push('state');
  if (!patient.zipCode) missingFields.push('zipCode');
  if (!patient.phone) missingFields.push('phone');

  if (missingFields.length > 0) {
    await db
      .update(schema.patients)
      .set({
        doseSpotSyncStatus: 'blocked',
        doseSpotSyncError: `Missing required demographics: ${missingFields.join(', ')}`,
        updatedAt: new Date(),
      })
      .where(eq(schema.patients.id, patientId));
    
    return { success: false, missingFields };
  }

  const syncInput: SyncPatientInput = {
    firstName: patient.firstName,
    lastName: patient.lastName,
    dateOfBirth: patient.dateOfBirth!,
    gender: patient.gender ?? 'Unknown',
    email: patient.phone ?? undefined, // Fallback if email is missing? Users table has email.
    address1: patient.address1!,
    address2: patient.address2 ?? undefined,
    city: patient.city!,
    state: patient.state!,
    zipCode: patient.zipCode!,
    phone: patient.phone!,
    mrn: patient.mrn || patient.id,
    existingDoseSpotPatientId: patient.doseSpotPatientId ?? undefined,
  };

  // If email is missing, try to get it from users table
  if (patient.userId) {
    const [user] = await db
      .select({ email: schema.users.email })
      .from(schema.users)
      .where(eq(schema.users.id, patient.userId))
      .limit(1);
    if (user) {
      syncInput.email = user.email;
    }
  }

  const result = await syncDoseSpotPatient(syncInput, { onBehalfOfClinicianId });

  await db
    .update(schema.patients)
    .set({
      doseSpotPatientId: result.doseSpotPatientId,
      doseSpotSyncStatus: result.syncStatus,
      doseSpotSyncError: result.syncError,
      doseSpotLastSyncAt: new Date(),
      updatedAt: new Date(),
    })
    .where(eq(schema.patients.id, patientId));

  return { success: result.syncStatus === 'ready', ...result };
}
