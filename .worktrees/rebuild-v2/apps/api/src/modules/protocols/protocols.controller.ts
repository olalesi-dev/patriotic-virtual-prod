import { Elysia, t } from 'elysia';
import { authMacro } from '../auth/macro';
import { ProtocolsService } from './protocols.service';

const service = new ProtocolsService();

export const protocolsController = new Elysia({ prefix: '/protocols' })
  .use(authMacro)
  .get(
    '/',
    async ({ user }) => {
      return await service.getProtocols(user.organizationId!);
    },
    {
      isSignIn: true,
      requirePermissions: ['patients:read'],
      detail: { summary: 'List Clinical Protocols', tags: ['Clinical'] },
    }
  )
  .post(
    '/',
    async ({ body, user }) => {
      return await service.createProtocol(user.organizationId!, body);
    },
    {
      isSignIn: true,
      requirePermissions: ['admin:settings:write'],
      body: t.Object({
        title: t.String(),
        type: t.String(),
        content: t.Optional(t.String()),
        metadata: t.Optional(t.Record(t.String(), t.Any())),
      }),
      detail: { summary: 'Create Clinical Protocol', tags: ['Admin'] },
    }
  );
