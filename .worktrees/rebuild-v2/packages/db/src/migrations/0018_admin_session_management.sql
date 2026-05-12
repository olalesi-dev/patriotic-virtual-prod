ALTER TABLE "session" ADD COLUMN "login_method" text DEFAULT 'unknown' NOT NULL;
--> statement-breakpoint
CREATE INDEX "session_login_method_idx" ON "session" USING btree ("login_method");
--> statement-breakpoint
CREATE INDEX "session_user_created_at_idx" ON "session" USING btree ("userId","createdAt");
--> statement-breakpoint

INSERT INTO "modules" ("id", "parent_id", "name", "key", "sort_order", "created_at", "updated_at")
SELECT 'mod_admin_sessions', "id", 'Sessions', 'admin:sessions', 8, now(), now() FROM "modules" WHERE "key" = 'admin_center'
ON CONFLICT ("key") DO NOTHING;
--> statement-breakpoint

INSERT INTO "permissions" ("id", "module_id", "name", "key", "created_at", "updated_at")
SELECT 'perm_admin_sessions_read', modules.id, 'View User Sessions', 'admin:sessions:read', now(), now()
FROM "modules"
WHERE "modules"."key" = 'admin:sessions'
ON CONFLICT ("key") DO NOTHING;
--> statement-breakpoint

INSERT INTO "role_permissions" ("id", "role_id", "permission_id", "created_at")
SELECT 'rp_admin_sessions_' || roles.id || '_' || permissions.id, roles.id, permissions.id, now()
FROM "roles"
CROSS JOIN "permissions"
WHERE roles.name IN ('SuperAdmin', 'Admin')
  AND permissions.key = 'admin:sessions:read'
ON CONFLICT ("role_id", "permission_id") DO NOTHING;
--> statement-breakpoint
