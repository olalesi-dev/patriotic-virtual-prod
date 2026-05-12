import { Elysia, t } from 'elysia';
import { eq, inArray } from 'drizzle-orm';
import { revokeUserAuth } from '@workspace/auth/session-security';
import * as schema from '@workspace/db/schema';
import { db } from '../../../db';
import { authMacro } from '../../auth/macro';
import { logAuthSecurityEvent } from '../../auth/security-audit';

export const hasPermissionDowngrade = (
  previousPermissionIds: string[],
  nextPermissionIds: string[],
) => {
  const next = new Set(nextPermissionIds);
  return previousPermissionIds.some((permissionId) => !next.has(permissionId));
};

export const rolesController = new Elysia({ prefix: '/roles' })
  .use(authMacro)
  .get(
    '/',
    async () => db
        .select({
          roleId: schema.roles.id,
          roleName: schema.roles.name,
          permissionId: schema.permissions.id,
          permissionKey: schema.permissions.key,
          permissionName: schema.permissions.name,
        })
        .from(schema.roles)
        .leftJoin(
          schema.rolePermissions,
          eq(schema.rolePermissions.roleId, schema.roles.id),
        )
        .leftJoin(
          schema.permissions,
          eq(schema.rolePermissions.permissionId, schema.permissions.id),
        ),
    {
      isSignIn: true,
      requirePermissions: ['admin:roles:read'],
      detail: { summary: 'List Roles And Permissions', tags: ['Admin'] },
    },
  )
  .put(
    '/:id/permissions',
    async ({ params: { id }, body, user, session, request, ip }) => {
      const [role] = await db
        .select({ id: schema.roles.id })
        .from(schema.roles)
        .where(eq(schema.roles.id, id))
        .limit(1);

      if (!role) {throw new Error('Role not found');}

      const previousRows = await db
        .select({ permissionId: schema.rolePermissions.permissionId })
        .from(schema.rolePermissions)
        .where(eq(schema.rolePermissions.roleId, id));
      const previousPermissionIds = previousRows.map((row) => row.permissionId);
      const {permissionIds} = (body as { permissionIds: string[] });
      const nextPermissionIds: string[] = [...new Set<string>(permissionIds)];
      const isDowngrade = hasPermissionDowngrade(
        previousPermissionIds,
        nextPermissionIds,
      );
      const removedPermissionIds = previousPermissionIds.filter(
        (permissionId) => !nextPermissionIds.includes(permissionId),
      );

      const affectedUsers = isDowngrade
        ? await db
            .select({ id: schema.users.id })
            .from(schema.users)
            .where(eq(schema.users.roleId, id))
        : [];

      await db.transaction(async (tx) => {
        await tx
          .delete(schema.rolePermissions)
          .where(eq(schema.rolePermissions.roleId, id));

        if (nextPermissionIds.length > 0) {
          await tx.insert(schema.rolePermissions).values(
            nextPermissionIds.map((permissionId) => ({
              roleId: id,
              permissionId,
            })),
          );
        }
      });

      if (isDowngrade) {
        await Promise.all(
          affectedUsers.map(async (affectedUser) => {
            const revocation = await revokeUserAuth(
              db as never,
              affectedUser.id,
              'permission_downgrade',
            );
            await logAuthSecurityEvent({
              actor: user,
              actorRole: session.role,
              targetUserId: affectedUser.id,
              event: 'permission_downgrade',
              request,
              ipAddress: ip,
              details: {
                roleId: id,
                removedPermissionIds,
                tokenVersion: revocation.tokenVersion,
              },
            });
          },
          ),
        );
      }

      const permissions =
        nextPermissionIds.length > 0
          ? await db
              .select()
              .from(schema.permissions)
              .where(inArray(schema.permissions.id, nextPermissionIds))
          : [];

      return {
        roleId: id,
        permissions,
        revokedUsers: affectedUsers.length,
        downgraded: isDowngrade,
      };
    },
    {
      isSignIn: true,
      requirePermissions: ['admin:roles:write'],
      requireStepUp: true,
      params: t.Object({ id: t.String() }),
      body: t.Object({
        permissionIds: t.Array(t.String()),
      }),
      detail: { summary: 'Replace Role Permissions', tags: ['Admin'] },
    },
  );
