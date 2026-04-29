import { Elysia } from 'elysia';
import { settingsController } from './settings/settings.controller';
import { usersController } from './users/users.controller';
import { auditController } from './audit/audit.controller';
import { storeController } from './store/store.controller';
import { communityController } from './community/community.controller';
import { communicationsController } from './communications/communications.controller';

export const adminController = new Elysia({ prefix: '/admin' })
  .use(settingsController)
  .use(usersController)
  .use(auditController)
  .use(storeController)
  .use(communityController)
  .use(communicationsController);
