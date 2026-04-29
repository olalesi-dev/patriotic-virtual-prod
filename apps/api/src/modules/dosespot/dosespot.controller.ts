import { Elysia } from 'elysia';
import { clinicianController } from './controllers/clinician.controller';
import { patientWorkflowController } from './controllers/patient-workflow.controller';
import { webhookController } from './controllers/webhook.controller';
import { taskQueueController } from './controllers/task-queue.controller';

export const dosespotController = new Elysia({ prefix: '/dosespot' })
  .use(clinicianController)
  .use(patientWorkflowController)
  .use(webhookController)
  .use(taskQueueController);
