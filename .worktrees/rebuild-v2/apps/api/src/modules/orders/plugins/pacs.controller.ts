import { Elysia } from 'elysia';
import { authMacro } from '../../auth/macro';
import { env } from '@workspace/env/index';

export const pacsController = new Elysia({ prefix: '/pacs' })
  .use(authMacro)
  .get(
    '/studies',
    async ({ set }) => {
      if (!env.DICOM_BASE_URL) {
        set.status = 503;
        return { error: 'PACS service not configured' };
      }

      try {
        const res = await fetch(`${env.DICOM_BASE_URL}/studies`, {
          headers: {
            'CF-Access-Client-Id': env.CF_ACCESS_CLIENT_ID!,
            'CF-Access-Client-Secret': env.CF_ACCESS_CLIENT_SECRET!,
            Accept: 'application/json',
          },
        });

        return await res.json();
      } catch (error: any) {
        set.status = 500;
        return { error: error.message };
      }
    },
    {
      isSignIn: true,
      requirePermissions: ['patients:read'],
      detail: { summary: 'List DICOM Studies', tags: ['Orders'] },
    },
  );
