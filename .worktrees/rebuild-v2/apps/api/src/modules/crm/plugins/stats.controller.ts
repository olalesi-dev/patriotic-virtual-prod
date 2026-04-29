import { Elysia } from 'elysia';
import { authMacro } from '../../auth/macro';
import { db } from '../../../db';
import * as schema from '@workspace/db/schema';
import { eq, sql } from 'drizzle-orm';

export const statsController = new Elysia({ prefix: '/stats' })
  .use(authMacro)
  .get(
    '',
    async ({ user }) => {
      const orgId = user.organizationId!;
      const [patients] = await db
        .select({ count: sql<number>`count(*)` })
        .from(schema.patients)
        .where(eq(schema.patients.organizationId, orgId));
      const [facilities] = await db
        .select({ count: sql<number>`count(*)` })
        .from(schema.facilities)
        .where(eq(schema.facilities.organizationId, orgId));
      const [vendors] = await db
        .select({ count: sql<number>`count(*)` })
        .from(schema.vendors)
        .where(eq(schema.vendors.organizationId, orgId));
      const [campaigns] = await db
        .select({ count: sql<number>`count(*)` })
        .from(schema.campaigns)
        .where(eq(schema.campaigns.organizationId, orgId));
      const [grants] = await db
        .select({ count: sql<number>`count(*)` })
        .from(schema.grantProposals)
        .where(eq(schema.grantProposals.organizationId, orgId));
      const [compliance] = await db
        .select({ count: sql<number>`count(*)` })
        .from(schema.complianceDocuments)
        .where(eq(schema.complianceDocuments.organizationId, orgId));

      return {
        patientsCount: patients.count,
        facilitiesCount: facilities.count,
        activeVendorsCount: vendors.count,
        activeCampaignsCount: campaigns.count,
        openGrantsCount: grants.count,
        complianceDocsCount: compliance.count,
      };
    },
    {
      isSignIn: true,
      detail: { summary: 'Get CRM Metrics', tags: ['CRM'] },
    },
  );
