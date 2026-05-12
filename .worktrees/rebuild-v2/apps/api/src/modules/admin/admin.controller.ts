import { Elysia } from 'elysia';
import { settingsController } from './settings/settings.controller';
import { usersController } from './users/users.controller';
import { sessionsController } from './sessions/sessions.controller';
import { rolesController } from './roles/roles.controller';
import { auditController } from './audit/audit.controller';
import { storeController } from './store/store.controller';
import { communityController } from './community/community.controller';
import { communicationsController } from './communications/communications.controller';
import { adminEmergencyAccessController } from '../emergency-access/emergency-access.controller';
import { adminDelegatedAccessController } from '../delegated-access/delegated-access.controller';

export const adminController = new Elysia({ prefix: '/admin' })
  .use(settingsController)
  .use(usersController)
  .use(sessionsController)
  .use(adminEmergencyAccessController)
  .use(adminDelegatedAccessController)
  .use(rolesController)
  .use(auditController)
  .use(storeController)
  .use(communityController)
  .use(communicationsController);
