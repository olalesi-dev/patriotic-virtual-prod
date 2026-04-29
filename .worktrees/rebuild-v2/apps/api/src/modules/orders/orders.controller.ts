import { Elysia } from 'elysia';
import { prescriptionsController } from './plugins/prescriptions.controller';
import { labsController } from './plugins/labs.controller';
import { imagingController } from './plugins/imaging.controller';
import { pacsController } from './plugins/pacs.controller';

export const ordersController = new Elysia({ prefix: '/orders' })
  .use(prescriptionsController)
  .use(labsController)
  .use(imagingController)
  .use(pacsController);
