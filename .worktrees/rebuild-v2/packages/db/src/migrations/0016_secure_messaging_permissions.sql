INSERT INTO "modules" ("id", "name", "key", "sort_order", "created_at", "updated_at")
VALUES ('mod_secure_messaging', 'Secure Messaging', 'communications', 8, now(), now())
ON CONFLICT ("key") DO NOTHING;--> statement-breakpoint

INSERT INTO "permissions" ("id", "module_id", "name", "key", "created_at", "updated_at")
SELECT permission_seed.id, modules.id, permission_seed.name, permission_seed.key, now(), now()
FROM (
	VALUES
		('perm_secure_messages_read', 'View Secure Messages', 'communications:read'),
		('perm_secure_messages_write', 'Send Secure Messages', 'communications:write')
) AS permission_seed(id, name, key)
CROSS JOIN "modules"
WHERE "modules"."key" = 'communications'
ON CONFLICT ("key") DO NOTHING;--> statement-breakpoint

INSERT INTO "role_permissions" ("id", "role_id", "permission_id", "created_at")
SELECT 'rp_messaging_' || roles.id || '_' || permissions.id, roles.id, permissions.id, now()
FROM "roles"
CROSS JOIN "permissions"
WHERE roles.name IN ('SuperAdmin', 'Admin', 'Provider', 'Staff', 'Radiologist', 'Patient')
  AND permissions.key IN ('communications:read', 'communications:write')
ON CONFLICT ("role_id", "permission_id") DO NOTHING;--> statement-breakpoint
