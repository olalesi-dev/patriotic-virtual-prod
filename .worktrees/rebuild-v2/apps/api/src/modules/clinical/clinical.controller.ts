import { Elysia } from 'elysia';
import { patientsController } from './patients/patients.controller';
import { teamController } from './team/team.controller';
import { appointmentsController } from './appointments/appointments.controller';
import { messagesController } from './messages/messages.controller';
import { dashboardController } from './dashboard/dashboard.controller';

export const clinicalController = new Elysia({ prefix: '/clinical' })
  .use(dashboardController)
  .use(patientsController)
  .use(teamController)
  .use(appointmentsController)
  .use(messagesController);
