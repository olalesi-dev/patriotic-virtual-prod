import { Elysia } from 'elysia';
import { statsController } from './plugins/stats.controller';
import { facilitiesController } from './plugins/facilities.controller';
import { vendorsController } from './plugins/vendors.controller';
import { marketingController } from './plugins/marketing.controller';
import { operationsController } from './plugins/operations.controller';

export const crmController = new Elysia({ prefix: '/crm' })
  .use(statsController)
  .use(facilitiesController)
  .use(vendorsController)
  .use(marketingController)
  .use(operationsController);
