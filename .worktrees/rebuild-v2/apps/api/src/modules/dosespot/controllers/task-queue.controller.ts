import { Elysia, t } from 'elysia';
import { authMacro } from '../../auth/macro';
import { db } from '../../../db';
import { DoseSpotWorkflowService } from '../workflow.service';

const workflowService = new DoseSpotWorkflowService(db);

export const taskQueueController = new Elysia({ prefix: '/queues' })
  .use(authMacro)
  .get(
    '/refills',
    async ({ user }) => await workflowService.getPendingRefillsQueue(user.id),
    {
      isSignIn: true,
      requirePermissions: ['appointments:read'],
      detail: { summary: 'Fetch Pending Refills Queue', tags: ['DoseSpot'] },
    },
  )
  .get(
    '/rx-changes',
    async ({ user }) => await workflowService.getPendingRxChangesQueue(user.id),
    {
      isSignIn: true,
      requirePermissions: ['appointments:read'],
      detail: { summary: 'Fetch Pending Rx Changes Queue', tags: ['DoseSpot'] },
    },
  )
  .get(
    '/rxchanges',
    async ({ user }) => await workflowService.getPendingRxChangesQueue(user.id),
    {
      isSignIn: true,
      requirePermissions: ['appointments:read'],
      detail: { summary: 'Fetch Pending Rx Changes Queue', tags: ['DoseSpot'] },
    },
  );
