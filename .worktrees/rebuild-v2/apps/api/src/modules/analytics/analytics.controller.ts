import { Elysia, t } from 'elysia';
import { authMacro } from '../auth/macro';
import { ClinicalAnalyticsService } from './clinical-analytics.service';
import { BusinessAnalyticsService } from './business-analytics.service';
import { GoogleAnalyticsService } from './google-analytics.service';

const clinicalService = new ClinicalAnalyticsService();
const businessService = new BusinessAnalyticsService();
const googleService = new GoogleAnalyticsService();

export const analyticsController = new Elysia({ prefix: '/analytics' })
  .use(authMacro)
  // Clinical Analytics
  .group('/clinical', { isSignIn: true }, (app) =>
    app
      .get('/stats', async ({ user }) => {
        return await clinicalService.getSummaryStats(user.organizationId!);
      })
      .get('/weight-loss-trend', async ({ user }) => {
        return await clinicalService.getWeightLossTrend(user.organizationId!);
      })
      .get('/overdue-labs', async ({ user }) => {
        return await clinicalService.getOverdueLabs(user.organizationId!);
      }),
  )
  // Business Analytics
  .group('/business', { isSignIn: true }, (app) =>
    app
      .get('/stats', async ({ user }) => {
        return await businessService.getSummaryStats(user.organizationId!);
      })
      .get('/revenue-trend', async ({ user }) => {
        return await businessService.getRevenueTrend(user.organizationId!);
      })
      .get('/acquisition-channels', async ({ user }) => {
        return await businessService.getAcquisitionChannels(user.organizationId!);
      }),
  )
  // Google Analytics
  .get(
    '/google',
    async () => {
      return await googleService.getTrafficReport();
    },
    {
      isSignIn: true,
      requirePermissions: ['admin:audit:read'],
      detail: {
        summary: 'Get Google Analytics Traffic Report',
        tags: ['Analytics'],
      },
    },
  );
