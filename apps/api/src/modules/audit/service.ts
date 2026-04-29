import { db } from '../../db';
import { auditLogs, organizations } from '@workspace/db';
import { eq, sql } from 'drizzle-orm';

/**
 * Generates a formatted, human-readable audit summary.
 */
export function generateAuditSummary(
  actorName: string,
  action: 'VIEW' | 'CREATE' | 'UPDATE' | 'DELETE' | string,
  resourceType: string,
  resourceId?: string
): string {
  const actionPast = getPastTense(action);
  const resourcePart = resourceId ? `${resourceType} ID ${resourceId}` : resourceType;
  return `${actorName} ${actionPast} ${resourcePart}`;
}

/**
 * Helper to get the past tense of an action.
 */
function getPastTense(action: string): string {
  const upperAction = action.toUpperCase();
  switch (upperAction) {
    case 'VIEW':
      return 'viewed';
    case 'CREATE':
      return 'created';
    case 'UPDATE':
      return 'updated';
    case 'DELETE':
      return 'deleted';
    default:
      // Fallback for custom actions
      const lowerAction = action.toLowerCase();
      if (lowerAction.endsWith('e')) {
        return `${lowerAction}d`;
      }
      return `${lowerAction}ed`;
  }
}

interface CreateAuditLogParams {
  actorId: string;
  actorName: string;
  actorRole: string;
  action: 'VIEW' | 'CREATE' | 'UPDATE' | 'DELETE' | string;
  resourceType: string;
  resourceId?: string;
  details?: Record<string, unknown>;
  ipAddress: string;
  organizationId?: string;
}

/**
 * Creates an audit log entry in the database.
 */
export async function createAuditLog({
  actorId,
  actorName,
  actorRole,
  action,
  resourceType,
  resourceId,
  details,
  ipAddress,
  organizationId,
}: CreateAuditLogParams) {
  let finalOrganizationId = organizationId;

  // Default organization lookup if not provided
  if (!finalOrganizationId) {
    const org = await db.query.organizations.findFirst({
      where: eq(organizations.name, 'Patriotic Virtual Telehealth'),
    });
    if (org) {
      finalOrganizationId = org.id;
    }
  }

  const summary = generateAuditSummary(actorName, action, resourceType, resourceId);

  if (!finalOrganizationId) {
    throw new Error('No organization context for audit log');
  }

  const [log] = await db
    .insert(auditLogs)
    .values({
      tableName: resourceType,
      recordId: resourceId ?? 'N/A',
      action,
      summary,
      actorId,
      actorName,
      actorRole,
      organizationId: finalOrganizationId,
      details: {
        ...details,
        ipAddress,
      },
    })
    .returning();

  return log;
}

interface GetAuditLogsParams {
  page: number;
  limit: number;
  userRole: string;
  organizationId?: string;
}

/**
 * Fetches audit logs with pagination and RBAC filters.
 */
export async function getAuditLogs({
  page,
  limit,
  userRole,
  organizationId,
}: GetAuditLogsParams) {
  const offset = (page - 1) * limit;

  const whereClause =
    userRole === 'SuperAdmin'
      ? undefined
      : eq(auditLogs.organizationId, organizationId!);

  const logs = await db.query.auditLogs.findMany({
    where: whereClause,
    limit,
    offset,
    orderBy: (logs, { desc }) => [desc(logs.createdAt)],
  });

  const [countResult] = await db
    .select({
      count: sql`count(*)`,
    })
    .from(auditLogs)
    .where(whereClause);

  const count = Number((countResult as { count: number }).count);

  return {
    logs,
    count,
  };
}
