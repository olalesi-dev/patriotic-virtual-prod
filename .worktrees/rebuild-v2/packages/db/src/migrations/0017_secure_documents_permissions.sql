INSERT INTO "modules" ("id", "name", "key", "sort_order", "created_at", "updated_at")
VALUES ('mod_secure_documents', 'Secure Documents', 'documents', 9, now(), now())
ON CONFLICT ("key") DO NOTHING;--> statement-breakpoint

INSERT INTO "permissions" ("id", "module_id", "name", "key", "created_at", "updated_at")
SELECT permission_seed.id, modules.id, permission_seed.name, permission_seed.key, now(), now()
FROM (
	VALUES
		('perm_secure_documents_read', 'View Secure Documents', 'documents:read'),
		('perm_secure_documents_write', 'Upload Secure Documents', 'documents:write')
) AS permission_seed(id, name, key)
CROSS JOIN "modules"
WHERE "modules"."key" = 'documents'
ON CONFLICT ("key") DO NOTHING;--> statement-breakpoint

INSERT INTO "role_permissions" ("id", "role_id", "permission_id", "created_at")
SELECT 'rp_documents_' || roles.id || '_' || permissions.id, roles.id, permissions.id, now()
FROM "roles"
CROSS JOIN "permissions"
WHERE roles.name IN ('SuperAdmin', 'Admin', 'Provider', 'Staff', 'Radiologist', 'Patient')
  AND permissions.key IN ('documents:read', 'documents:write')
ON CONFLICT ("role_id", "permission_id") DO NOTHING;--> statement-breakpoint
