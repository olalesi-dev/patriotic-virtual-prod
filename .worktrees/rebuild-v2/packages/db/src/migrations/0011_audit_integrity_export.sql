ALTER TABLE "audit_logs" ADD COLUMN "previous_hash" text;--> statement-breakpoint
ALTER TABLE "audit_logs" ADD COLUMN "hash_algorithm" text DEFAULT 'sha256' NOT NULL;--> statement-breakpoint
ALTER TABLE "audit_logs" ADD COLUMN "export_status" text DEFAULT 'not_required' NOT NULL;--> statement-breakpoint
ALTER TABLE "audit_logs" ADD COLUMN "exported_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "audit_logs" ADD COLUMN "export_attempts" integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE "audit_logs" ADD COLUMN "last_export_error" text;--> statement-breakpoint
ALTER TABLE "audit_logs" ADD COLUMN "external_sink_id" text;--> statement-breakpoint
CREATE INDEX "audit_logs_export_status_idx" ON "audit_logs" USING btree ("export_status","created_at");
