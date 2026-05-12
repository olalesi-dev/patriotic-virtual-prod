CREATE TABLE "break_glass_access_grants" (
	"id" text PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"organization_id" text NOT NULL,
	"granted_by_id" text,
	"activated_by_id" text,
	"reason" text NOT NULL,
	"activation_reason" text,
	"compensating_control" text,
	"status" text DEFAULT 'granted' NOT NULL,
	"scopes" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"expires_at" timestamp with time zone NOT NULL,
	"activated_at" timestamp with time zone,
	"ended_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "break_glass_access_grants" ADD CONSTRAINT "break_glass_access_grants_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "break_glass_access_grants" ADD CONSTRAINT "break_glass_access_grants_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE no action ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "break_glass_access_grants" ADD CONSTRAINT "break_glass_access_grants_granted_by_id_users_id_fk" FOREIGN KEY ("granted_by_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "break_glass_access_grants" ADD CONSTRAINT "break_glass_access_grants_activated_by_id_users_id_fk" FOREIGN KEY ("activated_by_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;
--> statement-breakpoint
CREATE INDEX "break_glass_access_grants_user_idx" ON "break_glass_access_grants" USING btree ("user_id");
--> statement-breakpoint
CREATE INDEX "break_glass_access_grants_org_status_idx" ON "break_glass_access_grants" USING btree ("organization_id","status");
--> statement-breakpoint
CREATE INDEX "break_glass_access_grants_expires_at_idx" ON "break_glass_access_grants" USING btree ("expires_at");
