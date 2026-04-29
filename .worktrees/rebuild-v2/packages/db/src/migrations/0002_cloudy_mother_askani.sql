CREATE TABLE "in_app_notifications" (
	"id" text PRIMARY KEY NOT NULL,
	"delivery_id" text NOT NULL,
	"recipient_id" text NOT NULL,
	"actor_id" text,
	"actor_name" text,
	"type" text NOT NULL,
	"title" text NOT NULL,
	"body" text NOT NULL,
	"href" text,
	"read" boolean DEFAULT false NOT NULL,
	"priority" text NOT NULL,
	"metadata" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"source" text DEFAULT 'app' NOT NULL,
	"read_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "in_app_notifications_delivery_id_unique" UNIQUE("delivery_id")
);
--> statement-breakpoint
CREATE TABLE "notification_deliveries" (
	"id" text PRIMARY KEY NOT NULL,
	"message_recipient_id" text NOT NULL,
	"channel" text NOT NULL,
	"status" text DEFAULT 'queued' NOT NULL,
	"attempt_count" integer DEFAULT 0 NOT NULL,
	"provider" text,
	"provider_message_id" text,
	"provider_response_code" text,
	"task_name" text,
	"scheduled_for" timestamp with time zone,
	"sent_at" timestamp with time zone,
	"delivered_at" timestamp with time zone,
	"failed_at" timestamp with time zone,
	"last_error" text,
	"metadata" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "notification_deliveries_channel_check" CHECK ("notification_deliveries"."channel" in ('email', 'sms', 'in_app')),
	CONSTRAINT "notification_deliveries_status_check" CHECK ("notification_deliveries"."status" in ('queued', 'processing', 'sent', 'delivered', 'retry_scheduled', 'failed', 'bounced', 'cancelled', 'skipped'))
);
--> statement-breakpoint
CREATE TABLE "notification_messages" (
	"id" text PRIMARY KEY NOT NULL,
	"topic_key" text NOT NULL,
	"entity_id" text NOT NULL,
	"dedupe_key" text NOT NULL,
	"status" text DEFAULT 'queued' NOT NULL,
	"priority" text NOT NULL,
	"category" text NOT NULL,
	"organization_id" text,
	"contains_phi" boolean DEFAULT false NOT NULL,
	"requires_audit" boolean DEFAULT true NOT NULL,
	"actor_id" text,
	"actor_name" text,
	"source" text,
	"template_data" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"metadata" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"scheduled_for" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "notification_messages_status_check" CHECK ("notification_messages"."status" in ('queued', 'cancelled', 'completed', 'skipped')),
	CONSTRAINT "notification_messages_priority_check" CHECK ("notification_messages"."priority" in ('critical', 'high', 'medium', 'low'))
);
--> statement-breakpoint
CREATE TABLE "notification_recipients" (
	"id" text PRIMARY KEY NOT NULL,
	"message_id" text NOT NULL,
	"recipient_id" text NOT NULL,
	"user_id" text,
	"email" text,
	"phone" text,
	"display_name" text NOT NULL,
	"role" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "notification_events" (
	"id" text PRIMARY KEY NOT NULL,
	"delivery_id" text,
	"provider" text NOT NULL,
	"event_type" text NOT NULL,
	"provider_event_id" text NOT NULL,
	"provider_message_id" text,
	"provider_recipient_email" text,
	"payload" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"occurred_at" timestamp with time zone NOT NULL,
	"processed_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "user_notification_preferences" (
	"id" text PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"category" text NOT NULL,
	"in_app_enabled" boolean DEFAULT true NOT NULL,
	"email_enabled" boolean DEFAULT false NOT NULL,
	"sms_enabled" boolean DEFAULT false NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "user_push_tokens" (
	"id" text PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"provider" text DEFAULT 'fcm' NOT NULL,
	"token" text NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"invalidated_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "patients" ADD COLUMN "user_id" text;--> statement-breakpoint
ALTER TABLE "patients" ADD COLUMN "phone" text;--> statement-breakpoint
ALTER TABLE "providers" ADD COLUMN "user_id" text;--> statement-breakpoint
ALTER TABLE "providers" ADD COLUMN "phone" text;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "phone" text;--> statement-breakpoint
ALTER TABLE "in_app_notifications" ADD CONSTRAINT "in_app_notifications_delivery_id_notification_deliveries_id_fk" FOREIGN KEY ("delivery_id") REFERENCES "public"."notification_deliveries"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "in_app_notifications" ADD CONSTRAINT "in_app_notifications_actor_id_users_id_fk" FOREIGN KEY ("actor_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "notification_deliveries" ADD CONSTRAINT "notification_deliveries_message_recipient_id_notification_recipients_id_fk" FOREIGN KEY ("message_recipient_id") REFERENCES "public"."notification_recipients"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "notification_messages" ADD CONSTRAINT "notification_messages_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "notification_messages" ADD CONSTRAINT "notification_messages_actor_id_users_id_fk" FOREIGN KEY ("actor_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "notification_recipients" ADD CONSTRAINT "notification_recipients_message_id_notification_messages_id_fk" FOREIGN KEY ("message_id") REFERENCES "public"."notification_messages"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "notification_recipients" ADD CONSTRAINT "notification_recipients_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "notification_events" ADD CONSTRAINT "notification_events_delivery_id_notification_deliveries_id_fk" FOREIGN KEY ("delivery_id") REFERENCES "public"."notification_deliveries"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_notification_preferences" ADD CONSTRAINT "user_notification_preferences_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_push_tokens" ADD CONSTRAINT "user_push_tokens_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "in_app_notifications_recipient_created_idx" ON "in_app_notifications" USING btree ("recipient_id","created_at");--> statement-breakpoint
CREATE INDEX "in_app_notifications_recipient_read_idx" ON "in_app_notifications" USING btree ("recipient_id","read");--> statement-breakpoint
CREATE INDEX "notification_deliveries_recipient_idx" ON "notification_deliveries" USING btree ("message_recipient_id");--> statement-breakpoint
CREATE INDEX "notification_deliveries_provider_message_idx" ON "notification_deliveries" USING btree ("provider_message_id");--> statement-breakpoint
CREATE INDEX "notification_deliveries_task_name_idx" ON "notification_deliveries" USING btree ("task_name");--> statement-breakpoint
CREATE INDEX "notification_deliveries_status_scheduled_idx" ON "notification_deliveries" USING btree ("status","scheduled_for");--> statement-breakpoint
CREATE INDEX "notification_messages_dedupe_created_idx" ON "notification_messages" USING btree ("dedupe_key","created_at");--> statement-breakpoint
CREATE INDEX "notification_messages_entity_idx" ON "notification_messages" USING btree ("topic_key","entity_id");--> statement-breakpoint
CREATE INDEX "notification_messages_org_idx" ON "notification_messages" USING btree ("organization_id");--> statement-breakpoint
CREATE INDEX "notification_messages_scheduled_idx" ON "notification_messages" USING btree ("status","scheduled_for");--> statement-breakpoint
CREATE UNIQUE INDEX "notification_recipients_message_recipient_uidx" ON "notification_recipients" USING btree ("message_id","recipient_id");--> statement-breakpoint
CREATE INDEX "notification_recipients_user_id_idx" ON "notification_recipients" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "notification_recipients_recipient_id_idx" ON "notification_recipients" USING btree ("recipient_id");--> statement-breakpoint
CREATE UNIQUE INDEX "notification_events_provider_event_uidx" ON "notification_events" USING btree ("provider","provider_event_id");--> statement-breakpoint
CREATE INDEX "notification_events_delivery_id_idx" ON "notification_events" USING btree ("delivery_id");--> statement-breakpoint
CREATE INDEX "notification_events_provider_message_idx" ON "notification_events" USING btree ("provider_message_id");--> statement-breakpoint
CREATE INDEX "notification_events_recipient_email_idx" ON "notification_events" USING btree ("provider_recipient_email");--> statement-breakpoint
CREATE INDEX "notification_events_occurred_at_idx" ON "notification_events" USING btree ("occurred_at");--> statement-breakpoint
CREATE UNIQUE INDEX "user_notification_preferences_user_category_uidx" ON "user_notification_preferences" USING btree ("user_id","category");--> statement-breakpoint
CREATE INDEX "user_notification_preferences_user_id_idx" ON "user_notification_preferences" USING btree ("user_id");--> statement-breakpoint
CREATE UNIQUE INDEX "user_push_tokens_provider_token_uidx" ON "user_push_tokens" USING btree ("provider","token");--> statement-breakpoint
CREATE INDEX "user_push_tokens_user_active_idx" ON "user_push_tokens" USING btree ("user_id","is_active");--> statement-breakpoint
ALTER TABLE "patients" ADD CONSTRAINT "patients_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "providers" ADD CONSTRAINT "providers_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "appointments_patient_id_idx" ON "appointments" USING btree ("patient_id");--> statement-breakpoint
CREATE INDEX "appointments_provider_id_idx" ON "appointments" USING btree ("provider_id");--> statement-breakpoint
CREATE INDEX "appointments_scheduled_time_idx" ON "appointments" USING btree ("scheduled_time");--> statement-breakpoint
CREATE INDEX "audit_logs_organization_id_idx" ON "audit_logs" USING btree ("organization_id");--> statement-breakpoint
CREATE INDEX "audit_logs_record_idx" ON "audit_logs" USING btree ("table_name","record_id");--> statement-breakpoint
CREATE INDEX "patients_organization_id_idx" ON "patients" USING btree ("organization_id");--> statement-breakpoint
CREATE INDEX "providers_organization_id_idx" ON "providers" USING btree ("organization_id");--> statement-breakpoint
CREATE INDEX "users_role_id_idx" ON "users" USING btree ("role_id");--> statement-breakpoint
CREATE INDEX "users_organization_id_idx" ON "users" USING btree ("organization_id");--> statement-breakpoint
CREATE INDEX "identity_verifications_patient_id_idx" ON "identity_verifications" USING btree ("patient_id");--> statement-breakpoint
CREATE INDEX "identity_verifications_appointment_id_idx" ON "identity_verifications" USING btree ("appointment_id");--> statement-breakpoint
CREATE UNIQUE INDEX "identity_verifications_provider_job_uidx" ON "identity_verifications" USING btree ("provider","job_id");--> statement-breakpoint
ALTER TABLE "patients" ADD CONSTRAINT "patients_user_id_unique" UNIQUE("user_id");--> statement-breakpoint
ALTER TABLE "providers" ADD CONSTRAINT "providers_user_id_unique" UNIQUE("user_id");