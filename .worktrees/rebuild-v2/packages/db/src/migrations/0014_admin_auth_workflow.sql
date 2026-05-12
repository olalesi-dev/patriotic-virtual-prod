ALTER TABLE "users" ADD COLUMN "must_change_password" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "password_changed_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "admin_created_by_id" text;--> statement-breakpoint
ALTER TABLE "users" ADD CONSTRAINT "users_admin_created_by_id_users_id_fk" FOREIGN KEY ("admin_created_by_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE TABLE "admin_password_reset_requests" (
	"id" text PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"organization_id" text NOT NULL,
	"requested_email" text NOT NULL,
	"requested_by_user_id" text,
	"requested_ip_address" text NOT NULL,
	"requested_user_agent" text,
	"status" text DEFAULT 'pending' NOT NULL,
	"reason" text,
	"approved_by_id" text,
	"approved_at" timestamp with time zone,
	"rejected_by_id" text,
	"rejected_at" timestamp with time zone,
	"decision_reason" text,
	"delivered_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);--> statement-breakpoint
ALTER TABLE "admin_password_reset_requests" ADD CONSTRAINT "admin_password_reset_requests_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "admin_password_reset_requests" ADD CONSTRAINT "admin_password_reset_requests_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "admin_password_reset_requests" ADD CONSTRAINT "admin_password_reset_requests_requested_by_user_id_users_id_fk" FOREIGN KEY ("requested_by_user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "admin_password_reset_requests" ADD CONSTRAINT "admin_password_reset_requests_approved_by_id_users_id_fk" FOREIGN KEY ("approved_by_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "admin_password_reset_requests" ADD CONSTRAINT "admin_password_reset_requests_rejected_by_id_users_id_fk" FOREIGN KEY ("rejected_by_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "admin_password_reset_requests_user_status_idx" ON "admin_password_reset_requests" USING btree ("user_id","status");--> statement-breakpoint
CREATE INDEX "admin_password_reset_requests_org_status_idx" ON "admin_password_reset_requests" USING btree ("organization_id","status");--> statement-breakpoint
CREATE INDEX "admin_password_reset_requests_created_at_idx" ON "admin_password_reset_requests" USING btree ("created_at");
