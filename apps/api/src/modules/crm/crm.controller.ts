import { Elysia, t } from 'elysia';
import { authMacro } from '../auth/macro';
import { db } from '../../db';
import * as schema from '@workspace/db';
import { eq, and, desc, sql } from 'drizzle-orm';

export const crmController = new Elysia({ prefix: '/crm' })
  .use(authMacro)
  .group('', { isSignIn: true }, (app) =>
    app
      // Dashboard Stats
      .get('/stats', async ({ user }) => {
        const orgId = user.organizationId!;
        const [patients] = await db.select({ count: sql<number>`count(*)` }).from(schema.patients).where(eq(schema.patients.organizationId, orgId));
        const [facilities] = await db.select({ count: sql<number>`count(*)` }).from(schema.facilities).where(eq(schema.facilities.organizationId, orgId));
        const [vendors] = await db.select({ count: sql<number>`count(*)` }).from(schema.vendors).where(eq(schema.vendors.organizationId, orgId));
        const [campaigns] = await db.select({ count: sql<number>`count(*)` }).from(schema.campaigns).where(eq(schema.campaigns.organizationId, orgId));
        const [grants] = await db.select({ count: sql<number>`count(*)` }).from(schema.grantProposals).where(eq(schema.grantProposals.organizationId, orgId));
        const [compliance] = await db.select({ count: sql<number>`count(*)` }).from(schema.complianceDocuments).where(eq(schema.complianceDocuments.organizationId, orgId));

        return {
          patientsCount: patients.count,
          facilitiesCount: facilities.count,
          activeVendorsCount: vendors.count,
          activeCampaignsCount: campaigns.count,
          openGrantsCount: grants.count,
          complianceDocsCount: compliance.count,
        };
      }, { detail: { summary: 'Get CRM Metrics', tags: ['CRM'] } })

      // Facilities
      .get('/facilities', async ({ user }) => {
        return await db.select().from(schema.facilities).where(eq(schema.facilities.organizationId, user.organizationId!)).orderBy(desc(schema.facilities.createdAt));
      })
      .post('/facilities', async ({ body, user }) => {
        const [item] = await db.insert(schema.facilities).values({ ...body, organizationId: user.organizationId!, updatedAt: new Date() }).returning();
        return item;
      }, { body: t.Object({ name: t.String(), type: t.String(), address: t.Optional(t.String()), city: t.Optional(t.String()), state: t.Optional(t.String()), zipCode: t.Optional(t.String()), phone: t.Optional(t.String()) }) })

      // Vendors
      .get('/vendors', async ({ user }) => {
        return await db.select().from(schema.vendors).where(eq(schema.vendors.organizationId, user.organizationId!)).orderBy(desc(schema.vendors.createdAt));
      })
      .post('/vendors', async ({ body, user }) => {
        const [item] = await db.insert(schema.vendors).values({ ...body, organizationId: user.organizationId!, updatedAt: new Date() }).returning();
        return item;
      }, { body: t.Object({ name: t.String(), contactName: t.Optional(t.String()), email: t.Optional(t.String()), phone: t.Optional(t.String()), category: t.Optional(t.String()), contractEndDate: t.Optional(t.String()) }) })

      // Campaigns
      .get('/campaigns', async ({ user }) => {
        return await db.select().from(schema.campaigns).where(eq(schema.campaigns.organizationId, user.organizationId!)).orderBy(desc(schema.campaigns.createdAt));
      })

      // Grant Proposals
      .get('/grants', async ({ user }) => {
        return await db.select().from(schema.grantProposals).where(eq(schema.grantProposals.organizationId, user.organizationId!)).orderBy(desc(schema.grantProposals.createdAt));
      })

      // Time Sheets
      .get('/timesheets', async ({ user }) => {
        return await db.select({
          timesheet: schema.timeSheets,
          user: { id: schema.users.id, name: schema.users.name }
        }).from(schema.timeSheets).innerJoin(schema.users, eq(schema.timeSheets.userId, schema.users.id)).where(eq(schema.timeSheets.organizationId, user.organizationId!)).orderBy(desc(schema.timeSheets.date));
      })
      .post('/timesheets', async ({ body, user }) => {
        const [item] = await db.insert(schema.timeSheets).values({ ...body, userId: user.id, organizationId: user.organizationId!, updatedAt: new Date() }).returning();
        return item;
      }, { body: t.Object({ date: t.String(), hours: t.Number(), description: t.Optional(t.String()) }) })

      // Compliance Documents
      .get('/compliance', async ({ user }) => {
        return await db.select().from(schema.complianceDocuments).where(eq(schema.complianceDocuments.organizationId, user.organizationId!)).orderBy(desc(schema.complianceDocuments.createdAt));
      })
  );
