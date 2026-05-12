import { Elysia, t } from 'elysia';
import { randomUUID } from 'node:crypto';
import { desc, eq } from 'drizzle-orm';
import { authMacro } from '../../auth/macro';
import { db } from '../../../db';
import * as schema from '@workspace/db/schema';
import { doseSpotApiFetch } from '@workspace/dosespot/api';
import { dosespotConfig, generateSSOUrl } from '@workspace/dosespot/utils';
import {
  normalizeGender,
  normalizePhone,
  normalizeZip,
} from '@workspace/dosespot/patient-sync';
import { DoseSpotClinicianService } from '../clinician.service';
import { ensurePatientSynced } from '../dosespot.service';
import { DoseSpotWorkflowService } from '../workflow.service';
import { DoseSpotWebhookService } from '../webhook.service';
import {
  logDelegatedAccessAuditEvent,
  resolveDoseSpotOnBehalfOf,
} from '../../delegated-access/service';
import { ForbiddenException, NotFoundException } from '../../../utils/errors';
import {
  NotificationProducers,
  NotificationService,
} from '@workspace/notifications/index';
import { NotificationQueue } from '@workspace/queue/index';

const clinicianService = new DoseSpotClinicianService(db);
const workflowService = new DoseSpotWorkflowService(db);
const queue = new NotificationQueue();
const notificationService = new NotificationService(db, queue);
const producers = new NotificationProducers(db, notificationService);
const webhookService = new DoseSpotWebhookService(db, producers);

const defaultCounts = {
  pendingPrescriptions: 0,
  transmissionErrors: 0,
  refillRequests: 0,
  changeRequests: 0,
  total: 0,
};

const normalizeRole = (role?: string | null) =>
  role?.trim().toLowerCase() ?? null;

const canManageOtherPatients = (role?: string | null): boolean =>
  [
    'admin',
    'superadmin',
    'staff',
    'provider',
    'doctor',
    'clinician',
    'systems admin',
    'orgadmin',
    'biller',
  ].includes(normalizeRole(role) ?? '');

const isAdminRole = (role?: string | null): boolean =>
  ['admin', 'superadmin', 'staff'].includes(normalizeRole(role) ?? '');

const asNumber = (value: unknown): number | null => {
  if (typeof value === 'number' && Number.isFinite(value)) {return value;}
  if (typeof value === 'string') {
    const parsed = Number.parseInt(value, 10);
    return Number.isFinite(parsed) ? parsed : null;
  }
  return null;
};

const parsePositiveInt = (value: unknown): number | undefined => {
  const parsed = asNumber(value);
  return parsed && parsed > 0 ? Math.floor(parsed) : undefined;
};

const parseClinicScope = (value: unknown): 'Current' | 'All' =>
  typeof value === 'string' && value.trim().toLowerCase() === 'all'
    ? 'All'
    : 'Current';

const getDataObject = (payload: Record<string, any>) =>
  typeof payload.Data === 'object' && payload.Data !== null
    ? payload.Data
    : payload;

const parseCounts = (payload: Record<string, any>) => {
  const data = getDataObject(payload);
  const source =
    typeof data.Total === 'object' && data.Total !== null ? data.Total : data;
  const pendingPrescriptions =
    asNumber(source.PendingPrescriptionCount ?? source.pendingPrescriptions) ??
    0;
  const transmissionErrors =
    asNumber(source.TransmissionErrorCount ?? source.transmissionErrors) ?? 0;
  const refillRequests =
    asNumber(source.RefillRequestCount ?? source.refillRequests) ?? 0;
  const changeRequests =
    asNumber(source.ChangeRequestCount ?? source.changeRequests) ?? 0;

  return {
    pendingPrescriptions,
    transmissionErrors,
    refillRequests,
    changeRequests,
    total:
      pendingPrescriptions +
      transmissionErrors +
      refillRequests +
      changeRequests,
  };
};

const getClinicianIdFromPayload = (payload: Record<string, any>) => {
  const data = getDataObject(payload);
  return (
    asNumber(data.ClinicianId) ??
    asNumber(payload.ClinicianId) ??
    asNumber(data.PrescriberId) ??
    asNumber(payload.PrescriberId)
  );
};

const getProviderForUser = async (userId: string) => {
  const [provider] = await db
    .select()
    .from(schema.providers)
    .where(eq(schema.providers.userId, userId))
    .limit(1);

  return provider;
};

const getProviderClinicianId = async (userId: string) => {
  const provider = await getProviderForUser(userId);
  return provider?.doseSpotClinicianId
    ? Number(provider.doseSpotClinicianId)
    : null;
};

const resolveDoseSpotDelegationContext = async ({
  user,
  session,
  request,
  ip,
}: {
  user: { id: string; organizationId?: string | null };
  session?: { role?: string | null } | null;
  request?: Request;
  ip?: string;
}) => {
  if (!user.organizationId) {
    return null;
  }

  const delegation = await resolveDoseSpotOnBehalfOf({
    actorUserId: user.id,
    organizationId: user.organizationId,
  });

  if (!delegation) {
    return null;
  }

  await logDelegatedAccessAuditEvent({
    actor: user,
    actorRole: session?.role,
    delegationId: delegation.delegationId,
    targetProviderId: delegation.targetProviderId,
    event: 'delegated_access_dosespot_on_behalf',
    request,
    ipAddress: ip,
    organizationId: user.organizationId,
    details: {
      clinicianIdResolved: true,
      scopes: delegation.scopes,
    },
  });

  return delegation;
};

const getEffectiveDoseSpotClinicianId = async ({
  user,
  session,
  request,
  ip,
}: {
  user: { id: string; organizationId?: string | null };
  session?: { role?: string | null } | null;
  request?: Request;
  ip?: string;
}) => {
  const delegated = await resolveDoseSpotDelegationContext({
    user,
    session,
    request,
    ip,
  });

  return delegated?.clinicianId ?? (await getProviderClinicianId(user.id));
};

const resolvePatientId = async (userId: string, requestedId?: string) => {
  const normalized = requestedId?.trim();
  if (normalized) {
    const [directPatient] = await db
      .select()
      .from(schema.patients)
      .where(eq(schema.patients.id, normalized))
      .limit(1);
    if (directPatient) {return directPatient.id;}

    const [patientByUser] = await db
      .select()
      .from(schema.patients)
      .where(eq(schema.patients.userId, normalized))
      .limit(1);
    if (patientByUser) {return patientByUser.id;}

    return normalized;
  }

  const [patient] = await db
    .select()
    .from(schema.patients)
    .where(eq(schema.patients.userId, userId))
    .limit(1);

  return patient?.id ?? userId;
};

const ensureOwnPatientAccess = (
  requesterId: string,
  requestedId: string,
  role?: string | null,
  message = 'Not authorized to access DoseSpot data for another patient.',
) => {
  if (requestedId !== requesterId && !canManageOtherPatients(role)) {
    throw new ForbiddenException(message);
  }
};

const getNotificationCounts = async (userId: string) => {
  const clinicianId = await getProviderClinicianId(userId);
  if (!clinicianId) {return defaultCounts;}

  const events = await db
    .select()
    .from(schema.dosespotWebhookEvents)
    .orderBy(desc(schema.dosespotWebhookEvents.receivedAt))
    .limit(300);

  for (const event of events) {
    const payload = event.payload as Record<string, any>;
    const eventClinicianId = getClinicianIdFromPayload(payload);
    if (eventClinicianId === clinicianId) {
      return parseCounts(payload);
    }
  }

  return defaultCounts;
};

const buildPatientEditPayload = (
  patient: typeof schema.patients.$inferSelect,
) => ({
  FirstName: patient.firstName,
  LastName: patient.lastName,
  DateOfBirth: `${patient.dateOfBirth}T00:00:00.000Z`,
  Gender: normalizeGender(patient.gender ?? undefined),
  Email: patient.email ?? undefined,
  Address1: patient.address1 ?? '',
  Address2: patient.address2 ?? undefined,
  City: patient.city ?? '',
  State: patient.state ?? '',
  ZipCode: normalizeZip(patient.zipCode ?? undefined),
  PrimaryPhone: normalizePhone(patient.phone ?? undefined),
  PrimaryPhoneType: 'Cell',
  NonDoseSpotMedicalRecordNumber: patient.mrn || patient.id,
  Active: false,
});

const deactivateDoseSpotPatient = async (
  patient: typeof schema.patients.$inferSelect,
  doseSpotPatientId: number,
  onBehalfOfClinicianId?: number,
) => {
  await doseSpotApiFetch(`api/patients/${doseSpotPatientId}`, {
    method: 'PUT',
    body: buildPatientEditPayload(patient),
    onBehalfOfClinicianId,
  });
};

const runScreenDemoValidation = async (input: {
  requesterUid: string;
  requesterRole?: string | null;
  requesterClinicianId: number | null;
  patientId?: string;
  clinicId?: 'Current' | 'All';
}) => {
  const checks: {
    key: string;
    title: string;
    status: 'pass' | 'fail' | 'skip';
    detail: string;
  }[] = [];
  const patientId = input.patientId ?? null;
  const onBehalfOfClinicianId = input.requesterClinicianId ?? undefined;

  if (!patientId) {
    checks.push({
      key: 'sso-patient',
      title: 'SSO patient launch URL ready',
      status: 'skip',
      detail: 'Skipped. Provide a patient UID to validate patient-chart SSO.',
    });
  } else if (!input.requesterClinicianId) {
    checks.push({
      key: 'sso-patient',
      title: 'SSO patient launch URL ready',
      status: 'fail',
      detail:
        'Current user is missing doseSpotClinicianId, so patient SSO cannot be generated.',
    });
  } else {
    try {
      const ensuredPatient = (await ensurePatientSynced(
        patientId,
        input.requesterClinicianId,
      )) as any;
      if (
        !ensuredPatient.doseSpotPatientId ||
        ensuredPatient.syncStatus !== 'ready'
      ) {
        checks.push({
          key: 'sso-patient',
          title: 'SSO patient launch URL ready',
          status: 'fail',
          detail: ensuredPatient.syncError ?? 'DoseSpot patient is not ready.',
        });
      } else {
        generateSSOUrl({
          clinicianDoseSpotId: input.requesterClinicianId,
          patientDoseSpotId: Number(ensuredPatient.doseSpotPatientId),
        });
        checks.push({
          key: 'sso-patient',
          title: 'SSO patient launch URL ready',
          status: 'pass',
          detail: 'Patient SSO URL generated.',
        });
      }
    } catch (error) {
      checks.push({
        key: 'sso-patient',
        title: 'SSO patient launch URL ready',
        status: 'fail',
        detail: error instanceof Error ? error.message : String(error),
      });
    }
  }

  if (!input.requesterClinicianId) {
    checks.push({
      key: 'sso-queue',
      title: 'SSO refills/errors launch URL ready',
      status: 'fail',
      detail:
        'Current user is missing doseSpotClinicianId, so refills/errors SSO cannot be generated.',
    });
  } else {
    try {
      generateSSOUrl({
        clinicianDoseSpotId: input.requesterClinicianId,
        refillsErrors: true,
      });
      checks.push({
        key: 'sso-queue',
        title: 'SSO refills/errors launch URL ready',
        status: 'pass',
        detail: 'Refills/errors SSO URL generated.',
      });
    } catch (error) {
      checks.push({
        key: 'sso-queue',
        title: 'SSO refills/errors launch URL ready',
        status: 'fail',
        detail: error instanceof Error ? error.message : String(error),
      });
    }
  }

  if (!patientId) {
    checks.push({
      key: 'med-history',
      title: 'Medication history endpoint returns',
      status: 'skip',
      detail: 'Skipped. Provide a patient UID to validate medication history.',
    });
    checks.push({
      key: 'eligibility',
      title: 'Eligibility summary endpoint returns',
      status: 'skip',
      detail: 'Skipped. Provide a patient UID to validate eligibility summary.',
    });
  } else {
    for (const check of [
      {
        key: 'med-history',
        title: 'Medication history endpoint returns',
        run: () =>
          workflowService.getMedicationHistory(input.requesterUid, patientId, {
            onBehalfOfClinicianId,
          }),
        passDetail: (result: any) =>
          `Medication history call succeeded (${result.items.length} item(s) returned).`,
      },
      {
        key: 'eligibility',
        title: 'Eligibility summary endpoint returns',
        run: () =>
          workflowService.getPrescriptionSummary(
            input.requesterUid,
            patientId,
            {
              onBehalfOfClinicianId,
            },
          ),
        passDetail: (result: any) =>
          `Prescription summary succeeded (${result.eligibility.totalWithEligibilityId} with eligibility IDs).`,
      },
    ]) {
      try {
        const result = await check.run();
        checks.push({
          key: check.key,
          title: check.title,
          status: result.syncStatus === 'ready' ? 'pass' : 'fail',
          detail:
            result.syncStatus === 'ready'
              ? check.passDetail(result)
              : (result.message ?? 'DoseSpot call did not return ready.'),
        });
      } catch (error) {
        checks.push({
          key: check.key,
          title: check.title,
          status: 'fail',
          detail: error instanceof Error ? error.message : String(error),
        });
      }
    }
  }

  for (const check of [
    {
      key: 'refills-queue',
      title: 'Refills queue endpoint returns',
      run: () =>
        workflowService.getPendingRefillsQueue(input.requesterUid, {
          clinicId: input.clinicId,
          patientId: patientId ?? undefined,
          onBehalfOfClinicianId,
        }),
    },
    {
      key: 'rxchange-queue',
      title: 'RxChange queue endpoint returns',
      run: () =>
        workflowService.getPendingRxChangesQueue(input.requesterUid, {
          clinicId: input.clinicId,
          patientId: patientId ?? undefined,
          onBehalfOfClinicianId,
        }),
    },
  ]) {
    try {
      const result = await check.run();
      checks.push({
        key: check.key,
        title: check.title,
        status: result.syncStatus === 'ready' ? 'pass' : 'fail',
        detail:
          result.syncStatus === 'ready'
            ? `${check.title} succeeded (${result.totalItems} total item(s)).`
            : (result.message ?? 'DoseSpot call did not return ready.'),
      });
    } catch (error) {
      checks.push({
        key: check.key,
        title: check.title,
        status: 'fail',
        detail: error instanceof Error ? error.message : String(error),
      });
    }
  }

  const counts = await getNotificationCounts(input.requesterUid);
  checks.push({
    key: 'notifications',
    title: 'Notification count endpoint returns',
    status: 'pass',
    detail: `Notification count endpoint succeeded (current total ${counts.total}).`,
  });

  const webhookValidation = await webhookService.getValidationReport();
  checks.push({
    key: 'webhook-outbound',
    title: 'DoseSpot outbound webhook delivery observed',
    status: webhookValidation.validated ? 'pass' : 'fail',
    detail: webhookValidation.validated
      ? webhookValidation.message
      : `${webhookValidation.message} Event types seen: ${
          webhookValidation.observedEventTypes.join(', ') || 'none'
        }.`,
  });

  const summary = {
    total: checks.length,
    passed: checks.filter((check) => check.status === 'pass').length,
    failed: checks.filter((check) => check.status === 'fail').length,
    skipped: checks.filter((check) => check.status === 'skip').length,
  };

  return {
    runId: randomUUID(),
    requesterUid: input.requesterUid,
    requesterClinicianId: input.requesterClinicianId,
    patientUid: patientId,
    clinicId: input.clinicId ?? 'Current',
    checks,
    summary,
    webhookValidation,
    createdAt: new Date().toISOString(),
  };
};

export const dosespotCompatibilityController = new Elysia()
  .use(authMacro)
  .get(
    '/sso-url',
    async ({ user, session, query, request, ip }) => {
      const provider = await getProviderForUser(user.id);
      const delegation = await resolveDoseSpotDelegationContext({
        user,
        session,
        request,
        ip,
      });
      let signingClinicianId: number;

      if (provider?.doseSpotClinicianId) {
        signingClinicianId = Number(provider.doseSpotClinicianId);
      } else if (isAdminRole(user.role)) {
        signingClinicianId = Number(dosespotConfig.userId);
      } else {
        throw new ForbiddenException(
          'Provider not configured for eRx. Contact admin.',
        );
      }

      let patientDoseSpotId = query.patientDoseSpotId
        ? Number(query.patientDoseSpotId)
        : undefined;
      const restClinicianId = delegation?.clinicianId ?? signingClinicianId;
      const patientId = query.patientUid
        ? await resolvePatientId(user.id, query.patientUid)
        : undefined;
      let ensuredPatientContext: any = null;

      if (patientId) {
        ensuredPatientContext = await ensurePatientSynced(
          patientId,
          restClinicianId,
        );
        if (
          ensuredPatientContext.syncStatus !== 'ready' ||
          !ensuredPatientContext.doseSpotPatientId
        ) {
          return {
            status: ensuredPatientContext.syncStatus,
            syncStatus: ensuredPatientContext.syncStatus,
            patientUid: patientId,
            doseSpotPatientId: null,
            missingFields: ensuredPatientContext.missingFields ?? [],
            candidatePatientIds: [],
            matchSource: ensuredPatientContext.matchSource ?? null,
            message:
              ensuredPatientContext.syncError ??
              'DoseSpot patient is not ready for SSO.',
          };
        }
        patientDoseSpotId = Number(ensuredPatientContext.doseSpotPatientId);
      }

      const url = generateSSOUrl({
        clinicianDoseSpotId: signingClinicianId,
        onBehalfOfUserId: delegation?.clinicianId,
        patientDoseSpotId,
        encounterId: query.encounterId,
        refillsErrors: query.refillsErrors === 'true',
      });

      return {
        status: 'ready',
        syncStatus: 'ready',
        patientUid: patientId ?? null,
        doseSpotPatientId: patientDoseSpotId ?? null,
        missingFields: ensuredPatientContext?.missingFields ?? [],
        candidatePatientIds: [],
        matchSource: ensuredPatientContext?.matchSource ?? null,
        onBehalfOf: delegation
          ? {
              delegationId: delegation.delegationId,
              targetProviderId: delegation.targetProviderId,
            }
          : null,
        message: patientDoseSpotId
          ? 'DoseSpot SSO URL generated for the requested patient.'
          : 'DoseSpot SSO URL generated.',
        ssoUrl: url,
        url,
      };
    },
    {
      isSignIn: true,
      requirePermissions: ['dosespot:sso'],
      query: t.Object({
        patientDoseSpotId: t.Optional(t.String()),
        patientUid: t.Optional(t.String()),
        encounterId: t.Optional(t.String()),
        refillsErrors: t.Optional(t.String()),
      }),
      detail: { summary: 'Legacy DoseSpot SSO URL', tags: ['DoseSpot'] },
    },
  )
  .get(
    '/notification-count',
    async ({ user }) => await getNotificationCounts(user.id),
    {
      isSignIn: true,
      requirePermissions: ['dosespot:sso'],
      detail: {
        summary: 'Legacy DoseSpot Notification Count',
        tags: ['DoseSpot'],
      },
    },
  )
  .post(
    '/push-notifications',
    async ({ body, headers, set }) => {
      const authHeader = headers.authorization;
      const secretHeader = headers['x-dosespot-secret'];
      if (!webhookService.verifySignature(authHeader, secretHeader)) {
        set.status = 401;
        return { error: 'Invalid or missing DoseSpot secret' };
      }

      const result = await webhookService.ingestWebhook(
        body as Record<string, any>,
        headers as any,
      );

      let inlineProcessed = false;
      if (result.status !== 'duplicate') {
        await webhookService.processEvent(result.id);
        inlineProcessed = true;
      }

      return {
        received: true,
        eventId: result.id,
        eventType: (body as Record<string, any>).EventType ?? 'Unknown',
        duplicate: result.status === 'duplicate',
        queued: result.status !== 'duplicate',
        inlineProcessed,
      };
    },
    {
      body: t.Record(t.String(), t.Any()),
      detail: { summary: 'Legacy DoseSpot Push Webhook', tags: ['DoseSpot'] },
    },
  )
  .post(
    '/push-notifications/process',
    async ({ body, headers, set }) => {
      const authHeader = headers.authorization;
      const secretHeader = headers['x-dosespot-secret'];
      if (!webhookService.verifySignature(authHeader, secretHeader)) {
        set.status = 401;
        return { error: 'Unauthorized task invocation' };
      }

      const result = await webhookService.processEvent(body.eventId);
      return {
        success: true,
        alreadyProcessed: result?.alreadyProcessed ?? true,
        eventId: body.eventId,
        notificationId: result?.notificationId ?? null,
        recipientId: result?.recipientId ?? null,
        internalType: result?.internalType ?? null,
      };
    },
    {
      body: t.Object({
        eventId: t.String(),
      }),
      detail: {
        summary: 'Legacy DoseSpot Webhook Processor',
        tags: ['DoseSpot'],
      },
    },
  )
  .get(
    '/push-notifications/health',
    () => ({
      status: 'ok',
      service: 'patriotic-telehealth-dosespot-webhook',
      timestamp: new Date().toISOString(),
      runtime: webhookService.getRuntimeHealth(),
    }),
    {
      detail: { summary: 'Legacy DoseSpot Webhook Health', tags: ['DoseSpot'] },
    },
  )
  .get(
    '/push-notifications/validation',
    async () => await webhookService.getValidationReport(),
    {
      isSignIn: true,
      requirePermissions: ['admin:settings:read'],
      detail: {
        summary: 'Legacy DoseSpot Webhook Validation',
        tags: ['DoseSpot'],
      },
    },
  )
  .post(
    '/screen-demo/validation',
    async ({ user, session, body, request, ip }) => {
      const patientId = body.patientUid
        ? await resolvePatientId(user.id, body.patientUid)
        : undefined;
      if (patientId) {
        ensureOwnPatientAccess(
          user.id,
          body.patientUid ?? patientId,
          user.role,
          'Not authorized to run DoseSpot validation for another patient.',
        );
      }

      return await runScreenDemoValidation({
        requesterUid: user.id,
        requesterRole: user.role,
        requesterClinicianId: await getEffectiveDoseSpotClinicianId({
          user,
          session,
          request,
          ip,
        }),
        patientId,
        clinicId: parseClinicScope(body.clinicId),
      });
    },
    {
      isSignIn: true,
      requirePermissions: ['dosespot:sso'],
      body: t.Object({
        patientUid: t.Optional(t.String()),
        clinicId: t.Optional(t.String()),
      }),
      detail: {
        summary: 'Legacy DoseSpot Screen Demo Validation',
        tags: ['DoseSpot'],
      },
    },
  )
  .get(
    '/clinicians/readiness',
    async ({ user }) => ({
      readiness: await clinicianService.getReadiness(user.id),
    }),
    {
      isSignIn: true,
      requirePermissions: ['dosespot:sso'],
      detail: { summary: 'Legacy Clinician Readiness', tags: ['DoseSpot'] },
    },
  )
  .post(
    '/clinicians/sync',
    async ({ user, body }) => {
      const requestedUid = body.clinicianUid ?? user.id;
      if (requestedUid !== user.id && !canManageOtherPatients(user.role)) {
        throw new ForbiddenException(
          'Not authorized to sync DoseSpot clinicians for another provider.',
        );
      }
      return await clinicianService.syncClinician(requestedUid);
    },
    {
      isSignIn: true,
      requirePermissions: ['dosespot:sso'],
      body: t.Object({
        clinicianUid: t.Optional(t.String()),
      }),
      detail: { summary: 'Legacy Clinician Sync', tags: ['DoseSpot'] },
    },
  )
  .post(
    '/clinicians/internal-sync',
    async ({ body, headers, set }) => {
      if (
        !webhookService.verifySignature(
          headers.authorization,
          headers['x-dosespot-secret'],
        )
      ) {
        set.status = 401;
        return { error: 'Unauthorized internal DoseSpot sync request.' };
      }
      return await clinicianService.syncClinician(body.clinicianUid);
    },
    {
      body: t.Object({ clinicianUid: t.String() }),
      detail: { summary: 'Legacy Internal Clinician Sync', tags: ['DoseSpot'] },
    },
  )
  .get(
    '/clinicians/registration-status',
    async ({ user, query }) => {
      const requestedUid = query.clinicianUid ?? user.id;
      if (requestedUid !== user.id && !canManageOtherPatients(user.role)) {
        throw new ForbiddenException(
          'Not authorized to read DoseSpot clinician registration status for another provider.',
        );
      }
      return await clinicianService.fetchRegistrationStatus(requestedUid);
    },
    {
      isSignIn: true,
      requirePermissions: ['dosespot:sso'],
      query: t.Object({ clinicianUid: t.Optional(t.String()) }),
      detail: { summary: 'Legacy Registration Status', tags: ['DoseSpot'] },
    },
  )
  .get(
    '/clinicians/legal-agreements',
    async ({ user }) => await clinicianService.fetchLegalAgreements(user.id),
    {
      isSignIn: true,
      requirePermissions: ['dosespot:sso'],
      detail: { summary: 'Legacy Legal Agreements', tags: ['DoseSpot'] },
    },
  )
  .post(
    '/clinicians/legal-agreements/accept',
    async ({ user, body }) =>
      await clinicianService.acceptLegalAgreement(
        user.id,
        String(body.agreementId),
      ),
    {
      isSignIn: true,
      requirePermissions: ['dosespot:sso'],
      body: t.Object({
        agreementId: t.Union([t.String(), t.Number()]),
      }),
      detail: { summary: 'Legacy Accept Legal Agreement', tags: ['DoseSpot'] },
    },
  )
  .get(
    '/clinicians/idp/disclaimer',
    async ({ user }) => await clinicianService.fetchIdpDisclaimer(user.id),
    {
      isSignIn: true,
      requirePermissions: ['dosespot:sso'],
      detail: { summary: 'Legacy IDP Disclaimer', tags: ['DoseSpot'] },
    },
  )
  .post(
    '/clinicians/idp/disclaimer',
    async ({ user, body }) =>
      await clinicianService.acceptIdpDisclaimer(user.id, body),
    {
      isSignIn: true,
      requirePermissions: ['dosespot:sso'],
      body: t.Optional(t.Record(t.String(), t.Any())),
      detail: { summary: 'Legacy Accept IDP Disclaimer', tags: ['DoseSpot'] },
    },
  )
  .post(
    '/clinicians/idp/init',
    async ({ user }) => await clinicianService.initIdp(user.id),
    {
      isSignIn: true,
      requirePermissions: ['dosespot:sso'],
      detail: { summary: 'Legacy IDP Init', tags: ['DoseSpot'] },
    },
  )
  .post(
    '/clinicians/idp/start',
    async ({ user, body }) => await clinicianService.startIdp(user.id, body),
    {
      isSignIn: true,
      requirePermissions: ['dosespot:sso'],
      body: t.Any(),
      detail: { summary: 'Legacy IDP Start', tags: ['DoseSpot'] },
    },
  )
  .post(
    '/clinicians/idp/answers',
    async ({ user, body }) =>
      await clinicianService.submitIdpAnswers(user.id, body),
    {
      isSignIn: true,
      requirePermissions: ['dosespot:sso'],
      body: t.Any(),
      detail: { summary: 'Legacy IDP Answers', tags: ['DoseSpot'] },
    },
  )
  .post(
    '/clinicians/idp/otp',
    async ({ user, body }) =>
      await clinicianService.submitIdpOtp(user.id, body),
    {
      isSignIn: true,
      requirePermissions: ['dosespot:sso'],
      body: t.Any(),
      detail: { summary: 'Legacy IDP OTP', tags: ['DoseSpot'] },
    },
  )
  .post(
    '/push-notifications/dev/test-activity',
    async ({ user, set }) => {
      if (process.env.NODE_ENV === 'production') {
        set.status = 404;
        return { error: 'Not found' };
      }
      const clinicianId = await getProviderClinicianId(user.id);
      if (!clinicianId) {
        throw new NotFoundException('Provider not linked to DoseSpot');
      }
      const result = await webhookService.ingestWebhook(
        {
          EventType: 'NotificationCounts',
          ClinicianId: clinicianId,
          Data: {
            ClinicianId: clinicianId,
            Total: {
              PendingPrescriptionCount: 1,
              TransmissionErrorCount: 0,
              RefillRequestCount: 1,
              ChangeRequestCount: 0,
            },
          },
          Headers: { 'x-dosespot-dev-helper': 'true' },
        },
        { 'x-dosespot-dev-helper': 'true' } as any,
      );

      return {
        success: true,
        clinicianId,
        eventId: result.id,
        autoLinked: false,
      };
    },
    {
      isSignIn: true,
      requirePermissions: ['admin:settings:write'],
      detail: { summary: 'Legacy Dev Test Activity', tags: ['DoseSpot'] },
    },
  )
  .post(
    '/push-notifications/dev/link-test-clinician',
    async ({ user, body, set }) => {
      if (process.env.NODE_ENV === 'production') {
        set.status = 404;
        return { error: 'Not found' };
      }
      const clinicianId =
        asNumber(body.clinicianId) ?? Number(dosespotConfig.userId);
      if (!clinicianId || !Number.isFinite(clinicianId)) {
        return { success: false, error: 'Missing clinicianId.' };
      }
      await db
        .update(schema.providers)
        .set({
          doseSpotClinicianId: String(clinicianId),
          updatedAt: new Date(),
        })
        .where(eq(schema.providers.userId, user.id));
      return { success: true, clinicianId, autoLinked: true };
    },
    {
      isSignIn: true,
      requirePermissions: ['admin:settings:write'],
      body: t.Object({
        clinicianId: t.Optional(t.Union([t.String(), t.Number()])),
      }),
      detail: { summary: 'Legacy Dev Link Test Clinician', tags: ['DoseSpot'] },
    },
  )
  .post(
    '/patients/ensure',
    async ({ user, session, body, request, ip }) => {
      const patientId = await resolvePatientId(user.id, body.patientUid);
      ensureOwnPatientAccess(
        user.id,
        body.patientUid ?? user.id,
        user.role,
        'Not authorized to sync DoseSpot data for another patient.',
      );
      const clinicianId = await getEffectiveDoseSpotClinicianId({
        user,
        session,
        request,
        ip,
      });
      return await ensurePatientSynced(patientId, clinicianId ?? undefined);
    },
    {
      isSignIn: true,
      requirePermissions: ['dosespot:patients:sync'],
      body: t.Object({
        patientUid: t.Optional(t.String()),
        updateExisting: t.Optional(t.Boolean()),
      }),
      detail: { summary: 'Legacy Ensure DoseSpot Patient', tags: ['DoseSpot'] },
    },
  )
  .post(
    '/patients/:id/preferred-pharmacy/sync',
    async ({ params: { id }, body, user, session, request, ip }) => {
      const patientId = await resolvePatientId(user.id, id);
      ensureOwnPatientAccess(
        user.id,
        id,
        user.role,
        'Not authorized to sync preferred pharmacy for another patient.',
      );

      const pharmacyId = asNumber(
        body?.preferredPharmacyDoseSpotId ?? body?.pharmacyId,
      );
      if (pharmacyId && pharmacyId <= 0) {
        return {
          error: 'preferredPharmacyDoseSpotId must be a positive integer.',
        };
      }

      const clinicianId = await getEffectiveDoseSpotClinicianId({
        user,
        session,
        request,
        ip,
      });
      const result = (await ensurePatientSynced(
        patientId,
        clinicianId ?? undefined,
      )) as any;

      if (pharmacyId && result.doseSpotPatientId) {
        await doseSpotApiFetch(
          `api/patients/${result.doseSpotPatientId}/pharmacies`,
          {
            method: 'POST',
            body: { PharmacyId: pharmacyId, SetAsPrimary: true },
            onBehalfOfClinicianId: clinicianId ?? undefined,
          },
        );
      }

      return result;
    },
    {
      isSignIn: true,
      requirePermissions: ['dosespot:patients:sync'],
      params: t.Object({ id: t.String() }),
      body: t.Optional(t.Record(t.String(), t.Any())),
      detail: {
        summary: 'Legacy Preferred Pharmacy Sync',
        tags: ['DoseSpot'],
      },
    },
  )
  .post(
    '/patients/delete',
    async ({ body, user, session, request, ip }) => {
      const patientId = await resolvePatientId(user.id, body.patientUid);
      ensureOwnPatientAccess(
        user.id,
        body.patientUid ?? user.id,
        user.role,
        'Not authorized to delete DoseSpot data for another patient.',
      );

      const [patient] = await db
        .select()
        .from(schema.patients)
        .where(eq(schema.patients.id, patientId))
        .limit(1);

      if (!patient) {throw new NotFoundException('Patient not found');}

      const candidateIds = [
        ...new Set(
          [
            patient.doseSpotPatientId
              ? Number(patient.doseSpotPatientId)
              : null,
            ...(body.candidatePatientIds ?? []).map((value: unknown) =>
              asNumber(value),
            ),
          ].filter((value): value is number => Boolean(value && value > 0)),
        ),
      ];

      if (candidateIds.length > 1 && body.deactivateAllExactMatches !== true) {
        return {
          status: 'ambiguous_match',
          patientUid: patientId,
          deletedPatientIds: [],
          candidatePatientIds: candidateIds,
          message:
            'Multiple exact DoseSpot patient matches were found. Pass candidate ids or request deletion of all exact matches.',
        };
      }

      const clinicianId =
        (await getEffectiveDoseSpotClinicianId({
          user,
          session,
          request,
          ip,
        })) ?? undefined;
      const deletedPatientIds: number[] = [];
      for (const id of candidateIds) {
        await deactivateDoseSpotPatient(patient, id, clinicianId);
        deletedPatientIds.push(id);
      }

      await db
        .update(schema.patients)
        .set({
          doseSpotPatientId: null,
          doseSpotSyncStatus: 'pending',
          doseSpotSyncError: null,
          updatedAt: new Date(),
        })
        .where(eq(schema.patients.id, patientId));

      return {
        status: deletedPatientIds.length > 0 ? 'deleted' : 'not_found',
        patientUid: patientId,
        deletedPatientIds,
        candidatePatientIds: candidateIds,
        message:
          deletedPatientIds.length > 0
            ? 'Deactivated the DoseSpot patient record and cleared the local link.'
            : 'No DoseSpot patient record was found for the requested deletion.',
      };
    },
    {
      isSignIn: true,
      requirePermissions: ['dosespot:patients:sync'],
      body: t.Object({
        patientUid: t.Optional(t.String()),
        candidatePatientIds: t.Optional(t.Array(t.Number())),
        deactivateAllExactMatches: t.Optional(t.Boolean()),
      }),
      detail: {
        summary: 'Legacy Delete DoseSpot Patient Link',
        tags: ['DoseSpot'],
      },
    },
  )
  .get(
    '/patients/:id/medication-history',
    async ({ params: { id }, user, session, query, request, ip }) => {
      const patientId = await resolvePatientId(user.id, id);
      ensureOwnPatientAccess(
        user.id,
        id,
        user.role,
        'Not authorized to read DoseSpot workflows for another patient.',
      );
      return await workflowService.getMedicationHistory(user.id, patientId, {
        start: query.start,
        end: query.end,
        pageNumber: parsePositiveInt(query.pageNumber),
        onBehalfOfClinicianId:
          (await getEffectiveDoseSpotClinicianId({
            user,
            session,
            request,
            ip,
          })) ?? undefined,
      });
    },
    {
      isSignIn: true,
      requirePermissions: ['patients:read'],
      params: t.Object({ id: t.String() }),
      query: t.Object({
        start: t.Optional(t.String()),
        end: t.Optional(t.String()),
        pageNumber: t.Optional(t.String()),
      }),
      detail: { summary: 'Legacy Medication History', tags: ['DoseSpot'] },
    },
  )
  .post(
    '/patients/:id/medication-history/consent',
    async ({ params: { id }, user, session, request, ip }) => {
      const patientId = await resolvePatientId(user.id, id);
      ensureOwnPatientAccess(
        user.id,
        id,
        user.role,
        'Not authorized to update DoseSpot workflows for another patient.',
      );
      return await workflowService.setMedicationHistoryConsent(
        user.id,
        patientId,
        true,
        {
          onBehalfOfClinicianId:
            (await getEffectiveDoseSpotClinicianId({
              user,
              session,
              request,
              ip,
            })) ?? undefined,
        },
      );
    },
    {
      isSignIn: true,
      requirePermissions: ['patients:write'],
      params: t.Object({ id: t.String() }),
      body: t.Optional(t.Record(t.String(), t.Any())),
      detail: {
        summary: 'Legacy Medication History Consent',
        tags: ['DoseSpot'],
      },
    },
  )
  .get(
    '/patients/:id/prescriptions',
    async ({ params: { id }, user, session, query, request, ip }) => {
      const patientId = await resolvePatientId(user.id, id);
      ensureOwnPatientAccess(
        user.id,
        id,
        user.role,
        'Not authorized to read DoseSpot workflows for another patient.',
      );
      return await workflowService.getPrescriptionSummary(user.id, patientId, {
        startDate: query.startDate,
        endDate: query.endDate,
        pageNumber: parsePositiveInt(query.pageNumber),
        statusClass:
          query.statusClass === 'Active' ||
          query.statusClass === 'Inactive' ||
          query.statusClass === 'Pending'
            ? query.statusClass
            : undefined,
        prescriptionStatus: query.prescriptionStatus,
        onBehalfOfClinicianId:
          (await getEffectiveDoseSpotClinicianId({
            user,
            session,
            request,
            ip,
          })) ?? undefined,
      });
    },
    {
      isSignIn: true,
      requirePermissions: ['patients:read'],
      params: t.Object({ id: t.String() }),
      query: t.Object({
        startDate: t.Optional(t.String()),
        endDate: t.Optional(t.String()),
        pageNumber: t.Optional(t.String()),
        statusClass: t.Optional(t.String()),
        prescriptionStatus: t.Optional(t.String()),
      }),
      detail: { summary: 'Legacy Prescriptions', tags: ['DoseSpot'] },
    },
  );
