import { and, eq, inArray } from 'drizzle-orm';
import * as schema from '@workspace/db/schema';
import type { PostgresJsDatabase } from 'drizzle-orm/postgres-js';

export async function getUserPermissionsAndModules(
  db: PostgresJsDatabase<typeof schema>,
  userId: string,
) {
  const [user] = await db
    .select({
      roleId: schema.users.roleId,
      roleName: schema.roles.name,
    })
    .from(schema.users)
    .leftJoin(schema.roles, eq(schema.users.roleId, schema.roles.id))
    .where(eq(schema.users.id, userId))
    .limit(1);

  if (!user || !user.roleId) {
    return {
      role: undefined,
      permissions: [],
      allowedModules: [],
    };
  }

  const rolePermissions = await db
    .select({
      permissionKey: schema.permissions.key,
      moduleKey: schema.modules.key,
      parentModuleKey: schema.modules.parentId, // We'll need a second query or a join for parent key
    })
    .from(schema.rolePermissions)
    .innerJoin(
      schema.permissions,
      eq(schema.rolePermissions.permissionId, schema.permissions.id),
    )
    .innerJoin(schema.modules, eq(schema.permissions.moduleId, schema.modules.id))
    .where(eq(schema.rolePermissions.roleId, user.roleId));

  const permissions = rolePermissions.map((p) => p.permissionKey);
  const moduleKeys = new Set<string>();

  for (const rp of rolePermissions) {
    moduleKeys.add(rp.moduleKey);
  }

  // Also include parent modules if they are not already in the set
  const parentIds = rolePermissions
    .map((rp) => rp.parentModuleKey)
    .filter((id): id is string => !!id);

  if (parentIds.length > 0) {
    const parentModules = await db
      .select({
        key: schema.modules.key,
      })
      .from(schema.modules)
      .where(inArray(schema.modules.id, parentIds));

    for (const pm of parentModules) {
      moduleKeys.add(pm.key);
    }
  }

  return {
    role: user.roleName,
    permissions,
    allowedModules: [...moduleKeys],
  };
}
