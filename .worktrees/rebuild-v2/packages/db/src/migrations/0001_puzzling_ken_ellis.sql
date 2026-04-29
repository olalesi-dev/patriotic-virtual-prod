ALTER TABLE "audit_logs" ADD COLUMN "summary" text NOT NULL;--> statement-breakpoint
ALTER TABLE "audit_logs" ADD COLUMN "actor_role" text;--> statement-breakpoint
ALTER TABLE "audit_logs" ADD COLUMN "organization_id" text;--> statement-breakpoint
ALTER TABLE "audit_logs" ADD COLUMN "details" jsonb;--> statement-breakpoint
ALTER TABLE "audit_logs" ADD CONSTRAINT "audit_logs_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE no action ON UPDATE no action;