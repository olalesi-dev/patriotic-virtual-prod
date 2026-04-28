import { Elysia } from 'elysia';
import { createAuditLog } from './service';

export const auditMacro = new Elysia({ name: 'audit.macro' }).macro({
  PHI(action: string) {
    return {
      async afterHandle(context) {
        const { user, ip, params, request } = context as any;
        if (!user) {
          throw new Error(
            'PHI macro requires a signed-in user. Ensure isSignIn: true is set on the route.',
          );
        }

        const resourceId = (params as any)?.id || (params as any)?.patientId;

        // Sensible default for resourceType and auditAction
        let auditAction = 'VIEW';
        let resourceType = action;

        if (action.includes(' ')) {
          const parts = action.split(' ');
          auditAction = parts[0];
          resourceType = parts.slice(1).join(' ');
        } else if (action.includes('_')) {
          const parts = action.split('_');
          auditAction = parts[0];
          resourceType = parts.slice(1).join('_');
        }

        await createAuditLog({
          actorId: user.id,
          actorName: user.name || user.email,
          actorRole: user.role || 'user',
          action: auditAction,
          resourceType,
          resourceId: resourceId ? String(resourceId) : undefined,
          ipAddress: ip || 'unknown',
          details: {
            url: request.url,
            method: request.method,
          },
        });
      },
    };
  },
});
