ALTER TABLE "messages" ADD COLUMN "encryption_mode" text DEFAULT 'plain' NOT NULL;--> statement-breakpoint
ALTER TABLE "messages" ADD COLUMN "encrypted_payload" jsonb;--> statement-breakpoint
ALTER TABLE "messages" ADD COLUMN "encrypted_key_recipients" jsonb DEFAULT '[]'::jsonb NOT NULL;--> statement-breakpoint
ALTER TABLE "messages" ADD CONSTRAINT "messages_encryption_mode_check" CHECK ("encryption_mode" IN ('plain', 'client_e2ee'));--> statement-breakpoint
ALTER TABLE "messages" ADD CONSTRAINT "messages_client_e2ee_payload_check" CHECK ("encryption_mode" = 'plain' OR ("encrypted_payload" IS NOT NULL AND jsonb_array_length("encrypted_key_recipients") > 0));--> statement-breakpoint
CREATE INDEX "messages_encryption_mode_idx" ON "messages" USING btree ("encryption_mode");--> statement-breakpoint

CREATE TABLE "encryption_key_registry" (
	"id" text PRIMARY KEY NOT NULL,
	"key_id" text NOT NULL,
	"provider" text NOT NULL,
	"purpose" text NOT NULL,
	"status" text DEFAULT 'active' NOT NULL,
	"metadata" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"rotated_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "encryption_key_registry_key_id_unique" UNIQUE("key_id")
);--> statement-breakpoint
CREATE INDEX "encryption_key_registry_provider_idx" ON "encryption_key_registry" USING btree ("provider");--> statement-breakpoint
CREATE INDEX "encryption_key_registry_purpose_status_idx" ON "encryption_key_registry" USING btree ("purpose","status");--> statement-breakpoint

CREATE TABLE "encrypted_document_uploads" (
	"id" text PRIMARY KEY NOT NULL,
	"organization_id" text NOT NULL,
	"owner_user_id" text NOT NULL,
	"storage_provider" text NOT NULL,
	"storage_object_key" text NOT NULL,
	"encryption_mode" text DEFAULT 'client_e2ee' NOT NULL,
	"encrypted_payload" jsonb NOT NULL,
	"encrypted_key_recipients" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"encrypted_metadata" jsonb,
	"mime_type" text,
	"size_bytes" integer,
	"checksum_sha256" text,
	"status" text DEFAULT 'pending' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);--> statement-breakpoint
ALTER TABLE "encrypted_document_uploads" ADD CONSTRAINT "encrypted_document_uploads_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "encrypted_document_uploads" ADD CONSTRAINT "encrypted_document_uploads_owner_user_id_users_id_fk" FOREIGN KEY ("owner_user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "encrypted_document_uploads" ADD CONSTRAINT "encrypted_document_uploads_encryption_mode_check" CHECK ("encryption_mode" = 'client_e2ee');--> statement-breakpoint
ALTER TABLE "encrypted_document_uploads" ADD CONSTRAINT "encrypted_document_uploads_recipients_check" CHECK (jsonb_array_length("encrypted_key_recipients") > 0);--> statement-breakpoint
CREATE INDEX "encrypted_document_uploads_owner_idx" ON "encrypted_document_uploads" USING btree ("owner_user_id");--> statement-breakpoint
CREATE INDEX "encrypted_document_uploads_org_status_idx" ON "encrypted_document_uploads" USING btree ("organization_id","status");--> statement-breakpoint
CREATE INDEX "encrypted_document_uploads_storage_uidx" ON "encrypted_document_uploads" USING btree ("storage_provider","storage_object_key");--> statement-breakpoint
