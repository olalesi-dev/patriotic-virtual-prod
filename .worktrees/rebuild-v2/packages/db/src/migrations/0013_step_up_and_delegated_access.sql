ALTER TABLE "session" ADD COLUMN "step_up_authenticated_at" timestamp;
--> statement-breakpoint
CREATE TABLE "delegated_access_sessions" (
	"id" text PRIMARY KEY NOT NULL,
	"organization_id" text NOT NULL,
	"actor_user_id" text NOT NULL,
	"target_user_id" text,
	"target_patient_id" text,
	"target_provider_id" text,
	"granted_by_id" text,
	"reason" text NOT NULL,
	"status" text DEFAULT 'active' NOT NULL,
	"scopes" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"expires_at" timestamp with time zone NOT NULL,
	"activated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"ended_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "delegated_access_sessions_target_required_chk" CHECK ("target_user_id" IS NOT NULL OR "target_patient_id" IS NOT NULL OR "target_provider_id" IS NOT NULL)
);
--> statement-breakpoint
ALTER TABLE "delegated_access_sessions" ADD CONSTRAINT "delegated_access_sessions_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE no action ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "delegated_access_sessions" ADD CONSTRAINT "delegated_access_sessions_actor_user_id_users_id_fk" FOREIGN KEY ("actor_user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "delegated_access_sessions" ADD CONSTRAINT "delegated_access_sessions_target_user_id_users_id_fk" FOREIGN KEY ("target_user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "delegated_access_sessions" ADD CONSTRAINT "delegated_access_sessions_target_patient_id_patients_id_fk" FOREIGN KEY ("target_patient_id") REFERENCES "public"."patients"("id") ON DELETE set null ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "delegated_access_sessions" ADD CONSTRAINT "delegated_access_sessions_target_provider_id_providers_id_fk" FOREIGN KEY ("target_provider_id") REFERENCES "public"."providers"("id") ON DELETE set null ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "delegated_access_sessions" ADD CONSTRAINT "delegated_access_sessions_granted_by_id_users_id_fk" FOREIGN KEY ("granted_by_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;
--> statement-breakpoint
CREATE INDEX "delegated_access_actor_status_idx" ON "delegated_access_sessions" USING btree ("actor_user_id","status","expires_at");
--> statement-breakpoint
CREATE INDEX "delegated_access_org_status_idx" ON "delegated_access_sessions" USING btree ("organization_id","status");
--> statement-breakpoint
CREATE INDEX "delegated_access_target_user_idx" ON "delegated_access_sessions" USING btree ("target_user_id");
--> statement-breakpoint
CREATE INDEX "delegated_access_target_patient_idx" ON "delegated_access_sessions" USING btree ("target_patient_id");
--> statement-breakpoint
CREATE INDEX "delegated_access_target_provider_idx" ON "delegated_access_sessions" USING btree ("target_provider_id");
--> statement-breakpoint
CREATE INDEX "delegated_access_scopes_gin_idx" ON "delegated_access_sessions" USING gin ("scopes");
--> statement-breakpoint
INSERT INTO "modules" ("id", "parent_id", "name", "key", "sort_order", "created_at", "updated_at")
SELECT 'mod_admin_settings', "id", 'Settings', 'admin:settings', 3, now(), now() FROM "modules" WHERE "key" = 'admin_center'
ON CONFLICT ("key") DO NOTHING;
--> statement-breakpoint
INSERT INTO "modules" ("id", "parent_id", "name", "key", "sort_order", "created_at", "updated_at")
SELECT 'mod_admin_audit', "id", 'Audit', 'admin:audit', 4, now(), now() FROM "modules" WHERE "key" = 'admin_center'
ON CONFLICT ("key") DO NOTHING;
--> statement-breakpoint
INSERT INTO "modules" ("id", "parent_id", "name", "key", "sort_order", "created_at", "updated_at")
SELECT 'mod_admin_store', "id", 'Store', 'admin:store', 5, now(), now() FROM "modules" WHERE "key" = 'admin_center'
ON CONFLICT ("key") DO NOTHING;
--> statement-breakpoint
INSERT INTO "modules" ("id", "parent_id", "name", "key", "sort_order", "created_at", "updated_at")
SELECT 'mod_admin_community', "id", 'Community', 'admin:community', 6, now(), now() FROM "modules" WHERE "key" = 'admin_center'
ON CONFLICT ("key") DO NOTHING;
--> statement-breakpoint
INSERT INTO "modules" ("id", "parent_id", "name", "key", "sort_order", "created_at", "updated_at")
SELECT 'mod_admin_communications', "id", 'Communications', 'admin:communications', 7, now(), now() FROM "modules" WHERE "key" = 'admin_center'
ON CONFLICT ("key") DO NOTHING;
--> statement-breakpoint
INSERT INTO "permissions" ("id", "module_id", "name", "key", "created_at", "updated_at")
SELECT seed.id, modules.id, seed.name, seed.key, now(), now()
FROM (
	VALUES
		('perm_admin_settings_read', 'admin:settings', 'View Settings', 'admin:settings:read'),
		('perm_admin_settings_write', 'admin:settings', 'Manage Settings', 'admin:settings:write'),
		('perm_admin_audit_read', 'admin:audit', 'View Audit', 'admin:audit:read'),
		('perm_admin_store_read', 'admin:store', 'View Store', 'admin:store:read'),
		('perm_admin_store_write', 'admin:store', 'Manage Store', 'admin:store:write'),
		('perm_admin_community_read', 'admin:community', 'View Community', 'admin:community:read'),
		('perm_admin_community_write', 'admin:community', 'Manage Community', 'admin:community:write'),
		('perm_admin_communications_read', 'admin:communications', 'View Communications', 'admin:communications:read'),
		('perm_admin_communications_write', 'admin:communications', 'Manage Communications', 'admin:communications:write')
) AS seed(id, module_key, name, key)
INNER JOIN "modules" ON "modules"."key" = seed.module_key
ON CONFLICT ("key") DO NOTHING;
--> statement-breakpoint
INSERT INTO "role_permissions" ("id", "role_id", "permission_id", "created_at")
SELECT 'rp_superadmin_' || permissions.id, roles.id, permissions.id, now()
FROM "roles"
CROSS JOIN "permissions"
WHERE roles.name = 'SuperAdmin'
  AND permissions.key IN (
	'admin:settings:read',
	'admin:settings:write',
	'admin:audit:read',
	'admin:store:read',
	'admin:store:write',
	'admin:community:read',
	'admin:community:write',
	'admin:communications:read',
	'admin:communications:write'
  )
ON CONFLICT ("role_id","permission_id") DO NOTHING;
--> statement-breakpoint
INSERT INTO "role_permissions" ("id", "role_id", "permission_id", "created_at")
SELECT 'rp_admin_' || permissions.id, roles.id, permissions.id, now()
FROM "roles"
CROSS JOIN "permissions"
WHERE roles.name = 'Admin'
  AND permissions.key IN (
	'admin:settings:read',
	'admin:settings:write',
	'admin:audit:read',
	'admin:store:read',
	'admin:store:write',
	'admin:community:read',
	'admin:community:write',
	'admin:communications:read',
	'admin:communications:write'
  )
ON CONFLICT ("role_id","permission_id") DO NOTHING;
