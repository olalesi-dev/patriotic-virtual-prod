CREATE EXTENSION IF NOT EXISTS pgcrypto;
CREATE EXTENSION IF NOT EXISTS pg_trgm;
CREATE TABLE "ai_action_items" (
	"id" text PRIMARY KEY NOT NULL,
	"organization_id" text NOT NULL,
	"patient_id" text NOT NULL,
	"type" text NOT NULL,
	"suggestion" text NOT NULL,
	"status" text DEFAULT 'Pending Review' NOT NULL,
	"group" text,
	"priority" text DEFAULT 'medium' NOT NULL,
	"metadata" jsonb,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "availability" (
	"id" text PRIMARY KEY NOT NULL,
	"provider_id" text NOT NULL,
	"type" text DEFAULT 'block' NOT NULL,
	"day_of_week" integer,
	"start_time" timestamp with time zone,
	"end_time" timestamp with time zone,
	"metadata" jsonb,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "broadcast_logs" (
	"id" text PRIMARY KEY NOT NULL,
	"organization_id" text NOT NULL,
	"subject" text NOT NULL,
	"body" text NOT NULL,
	"priority" text NOT NULL,
	"target_filters" jsonb NOT NULL,
	"recipient_count" integer NOT NULL,
	"sender_id" text NOT NULL,
	"timestamp" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "campaigns" (
	"id" text PRIMARY KEY NOT NULL,
	"organization_id" text NOT NULL,
	"name" text NOT NULL,
	"type" text NOT NULL,
	"status" text DEFAULT 'Planning' NOT NULL,
	"start_date" timestamp with time zone,
	"end_date" timestamp with time zone,
	"budget" integer,
	"metadata" jsonb,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "clinical_protocols" (
	"id" text PRIMARY KEY NOT NULL,
	"organization_id" text NOT NULL,
	"title" text NOT NULL,
	"type" text NOT NULL,
	"content" text,
	"metadata" jsonb,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "community_likes" (
	"id" text PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"post_id" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "community_posts" (
	"id" text PRIMARY KEY NOT NULL,
	"organization_id" text NOT NULL,
	"author_id" text NOT NULL,
	"text" text NOT NULL,
	"media_url" text,
	"media_type" text,
	"likes_count" integer DEFAULT 0 NOT NULL,
	"replies_count" integer DEFAULT 0 NOT NULL,
	"hidden" boolean DEFAULT false NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "community_profiles" (
	"id" text PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"display_name" text NOT NULL,
	"avatar_url" text,
	"bio" text,
	"journey_tag" text,
	"streak" integer DEFAULT 0 NOT NULL,
	"score" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "community_profiles_user_id_unique" UNIQUE("user_id")
);
--> statement-breakpoint
CREATE TABLE "community_replies" (
	"id" text PRIMARY KEY NOT NULL,
	"post_id" text NOT NULL,
	"author_id" text NOT NULL,
	"text" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "compliance_documents" (
	"id" text PRIMARY KEY NOT NULL,
	"organization_id" text NOT NULL,
	"title" text NOT NULL,
	"category" text NOT NULL,
	"status" text DEFAULT 'Draft' NOT NULL,
	"effective_date" timestamp with time zone,
	"expiration_date" timestamp with time zone,
	"version" text,
	"parties" jsonb DEFAULT '[]'::jsonb,
	"summary" text,
	"metadata" jsonb,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "consultations" (
	"id" text PRIMARY KEY NOT NULL,
	"patient_id" text,
	"service_key" text NOT NULL,
	"intake_answers" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"status" text DEFAULT 'pending_payment' NOT NULL,
	"payment_status" text DEFAULT 'pending' NOT NULL,
	"stripe_session_id" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "dosespot_webhook_events" (
	"id" text PRIMARY KEY NOT NULL,
	"dedupe_key" text NOT NULL,
	"event_type" text NOT NULL,
	"payload" jsonb NOT NULL,
	"status" text DEFAULT 'pending' NOT NULL,
	"error_message" text,
	"received_at" timestamp with time zone DEFAULT now() NOT NULL,
	"processed_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "dosespot_webhook_events_dedupe_key_unique" UNIQUE("dedupe_key")
);
--> statement-breakpoint
CREATE TABLE "facilities" (
	"id" text PRIMARY KEY NOT NULL,
	"organization_id" text NOT NULL,
	"name" text NOT NULL,
	"type" text NOT NULL,
	"address" text,
	"city" text,
	"state" text,
	"zip_code" text,
	"phone" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "grant_proposals" (
	"id" text PRIMARY KEY NOT NULL,
	"organization_id" text NOT NULL,
	"title" text NOT NULL,
	"agency" text NOT NULL,
	"amount" integer,
	"status" text DEFAULT 'Draft' NOT NULL,
	"deadline" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "imaging_orders" (
	"id" text PRIMARY KEY NOT NULL,
	"organization_id" text NOT NULL,
	"patient_id" text NOT NULL,
	"provider_id" text NOT NULL,
	"type" text NOT NULL,
	"status" text DEFAULT 'Ordered' NOT NULL,
	"notes" text,
	"ordered_at" timestamp with time zone DEFAULT now() NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "lab_orders" (
	"id" text PRIMARY KEY NOT NULL,
	"patient_id" text NOT NULL,
	"provider_id" text NOT NULL,
	"test_name" text NOT NULL,
	"status" text DEFAULT 'Ordered' NOT NULL,
	"ordered_at" timestamp with time zone DEFAULT now() NOT NULL,
	"completed_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "messages" (
	"id" text PRIMARY KEY NOT NULL,
	"sender_id" text NOT NULL,
	"recipient_id" text NOT NULL,
	"subject" text,
	"body" text NOT NULL,
	"is_read" boolean DEFAULT false NOT NULL,
	"read_at" timestamp with time zone,
	"thread_id" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "moderation_logs" (
	"id" text PRIMARY KEY NOT NULL,
	"organization_id" text NOT NULL,
	"document_id" text NOT NULL,
	"collection_name" text NOT NULL,
	"content" text NOT NULL,
	"author_name" text NOT NULL,
	"author_id" text NOT NULL,
	"ai_risk_level" text NOT NULL,
	"category" text,
	"reason" text,
	"action_taken" text,
	"resolved" boolean DEFAULT false NOT NULL,
	"timestamp" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "modules" (
	"id" text PRIMARY KEY NOT NULL,
	"parent_id" text,
	"name" text NOT NULL,
	"key" text NOT NULL,
	"sort_order" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "modules_key_unique" UNIQUE("key")
);
--> statement-breakpoint
CREATE TABLE "permissions" (
	"id" text PRIMARY KEY NOT NULL,
	"module_id" text NOT NULL,
	"name" text NOT NULL,
	"key" text NOT NULL,
	"description" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "permissions_key_unique" UNIQUE("key")
);
--> statement-breakpoint
CREATE TABLE "prescriptions" (
	"id" text PRIMARY KEY NOT NULL,
	"dosespot_prescription_id" integer,
	"patient_id" text NOT NULL,
	"provider_id" text NOT NULL,
	"medication_name" text NOT NULL,
	"dosage" text,
	"quantity" text,
	"refills" integer DEFAULT 0 NOT NULL,
	"status" text DEFAULT 'Pending' NOT NULL,
	"last_status_update" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "prescriptions_dosespot_prescription_id_unique" UNIQUE("dosespot_prescription_id")
);
--> statement-breakpoint
CREATE TABLE "role_permissions" (
	"id" text PRIMARY KEY NOT NULL,
	"role_id" text NOT NULL,
	"permission_id" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "services" (
	"id" text PRIMARY KEY NOT NULL,
	"organization_id" text NOT NULL,
	"name" text NOT NULL,
	"description" text,
	"price" integer NOT NULL,
	"category" text NOT NULL,
	"status" text DEFAULT 'Active' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "shop_discounts" (
	"id" text PRIMARY KEY NOT NULL,
	"code" text NOT NULL,
	"type" text NOT NULL,
	"value" integer NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "shop_discounts_code_unique" UNIQUE("code")
);
--> statement-breakpoint
CREATE TABLE "shop_order_items" (
	"id" text PRIMARY KEY NOT NULL,
	"order_id" text NOT NULL,
	"product_id" text,
	"product_name" text NOT NULL,
	"quantity" integer NOT NULL,
	"unit_price" integer NOT NULL
);
--> statement-breakpoint
CREATE TABLE "shop_orders" (
	"id" text PRIMARY KEY NOT NULL,
	"organization_id" text NOT NULL,
	"order_number" text NOT NULL,
	"patient_id" text NOT NULL,
	"total" integer NOT NULL,
	"payment_status" text NOT NULL,
	"fulfillment_status" text DEFAULT 'Pending' NOT NULL,
	"stripe_session_id" text,
	"shipping_address" jsonb,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "shop_orders_order_number_unique" UNIQUE("order_number")
);
--> statement-breakpoint
CREATE TABLE "shop_partners" (
	"id" text PRIMARY KEY NOT NULL,
	"organization_id" text NOT NULL,
	"name" text NOT NULL,
	"category" text NOT NULL,
	"logo" text,
	"short_description" text,
	"long_description" text,
	"affiliate_url" text,
	"status" text DEFAULT 'Active' NOT NULL,
	"is_featured" boolean DEFAULT false NOT NULL,
	"notes" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "shop_products" (
	"id" text PRIMARY KEY NOT NULL,
	"organization_id" text NOT NULL,
	"name" text NOT NULL,
	"slug" text NOT NULL,
	"sku" text NOT NULL,
	"short_description" text,
	"long_description" text,
	"price" integer NOT NULL,
	"compare_at_price" integer,
	"inventory_level" integer DEFAULT 0 NOT NULL,
	"low_stock_threshold" integer DEFAULT 5 NOT NULL,
	"images" jsonb DEFAULT '[]'::jsonb,
	"status" text DEFAULT 'Draft' NOT NULL,
	"category" text NOT NULL,
	"stripe_link" text,
	"iframe_url" text,
	"metadata" jsonb,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "shop_products_slug_unique" UNIQUE("slug"),
	CONSTRAINT "shop_products_sku_unique" UNIQUE("sku")
);
--> statement-breakpoint
CREATE TABLE "soap_notes" (
	"id" text PRIMARY KEY NOT NULL,
	"appointment_id" text NOT NULL,
	"patient_id" text NOT NULL,
	"provider_id" text NOT NULL,
	"subjective" text,
	"objective" text,
	"assessment" text,
	"plan" text,
	"is_locked" boolean DEFAULT false NOT NULL,
	"locked_at" timestamp with time zone,
	"locked_by" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "social_posts" (
	"id" text PRIMARY KEY NOT NULL,
	"organization_id" text NOT NULL,
	"text" text NOT NULL,
	"status" text DEFAULT 'draft' NOT NULL,
	"author_id" text NOT NULL,
	"platforms" jsonb DEFAULT '[]'::jsonb,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "subscriptions" (
	"id" text PRIMARY KEY NOT NULL,
	"patient_id" text NOT NULL,
	"plan_id" text NOT NULL,
	"status" text NOT NULL,
	"current_period_start" timestamp with time zone,
	"current_period_end" timestamp with time zone,
	"stripe_subscription_id" text,
	"mrr" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "subscriptions_stripe_subscription_id_unique" UNIQUE("stripe_subscription_id")
);
--> statement-breakpoint
CREATE TABLE "support_tickets" (
	"id" text PRIMARY KEY NOT NULL,
	"organization_id" text NOT NULL,
	"user_id" text NOT NULL,
	"subject" text NOT NULL,
	"message" text NOT NULL,
	"status" text DEFAULT 'Open' NOT NULL,
	"priority" text DEFAULT 'medium' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "system_settings" (
	"id" text PRIMARY KEY NOT NULL,
	"organization_id" text NOT NULL,
	"key" text NOT NULL,
	"value" jsonb NOT NULL,
	"description" text,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "time_sheets" (
	"id" text PRIMARY KEY NOT NULL,
	"organization_id" text NOT NULL,
	"user_id" text NOT NULL,
	"date" timestamp with time zone NOT NULL,
	"hours" integer NOT NULL,
	"description" text,
	"status" text DEFAULT 'Submitted' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "user_settings" (
	"id" text PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"key" text NOT NULL,
	"value" jsonb NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "vendors" (
	"id" text PRIMARY KEY NOT NULL,
	"organization_id" text NOT NULL,
	"name" text NOT NULL,
	"contact_name" text,
	"email" text,
	"phone" text,
	"category" text,
	"contract_end_date" timestamp with time zone,
	"status" text DEFAULT 'Active' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "vital_logs" (
	"id" text PRIMARY KEY NOT NULL,
	"patient_id" text NOT NULL,
	"type" text NOT NULL,
	"value" text NOT NULL,
	"unit" text,
	"recorded_at" timestamp with time zone DEFAULT now() NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
DROP INDEX "users_role_id_idx";--> statement-breakpoint
ALTER TABLE "appointments" ALTER COLUMN "provider_id" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "appointments" ALTER COLUMN "scheduled_time" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "audit_logs" ALTER COLUMN "actor_role" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "audit_logs" ALTER COLUMN "organization_id" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "appointments" ADD COLUMN "consultation_id" text;--> statement-breakpoint
ALTER TABLE "appointments" ADD COLUMN "type" text DEFAULT 'Telehealth' NOT NULL;--> statement-breakpoint
ALTER TABLE "appointments" ADD COLUMN "status" text DEFAULT 'pending_scheduling' NOT NULL;--> statement-breakpoint
ALTER TABLE "appointments" ADD COLUMN "reason" text;--> statement-breakpoint
ALTER TABLE "appointments" ADD COLUMN "meeting_url" text;--> statement-breakpoint
ALTER TABLE "appointments" ADD COLUMN "updated_at" timestamp with time zone DEFAULT now() NOT NULL;--> statement-breakpoint
ALTER TABLE "audit_logs" ADD COLUMN "actor_id" text;--> statement-breakpoint
ALTER TABLE "audit_logs" ADD COLUMN "actor_name" text NOT NULL;--> statement-breakpoint
ALTER TABLE "audit_logs" ADD COLUMN "ip_address" text;--> statement-breakpoint
ALTER TABLE "audit_logs" ADD COLUMN "user_agent" text;--> statement-breakpoint
ALTER TABLE "audit_logs" ADD COLUMN "is_phi_access" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "patients" ADD COLUMN "date_of_birth" text;--> statement-breakpoint
ALTER TABLE "patients" ADD COLUMN "gender" text;--> statement-breakpoint
ALTER TABLE "patients" ADD COLUMN "email" text;--> statement-breakpoint
ALTER TABLE "patients" ADD COLUMN "address1" text;--> statement-breakpoint
ALTER TABLE "patients" ADD COLUMN "address2" text;--> statement-breakpoint
ALTER TABLE "patients" ADD COLUMN "city" text;--> statement-breakpoint
ALTER TABLE "patients" ADD COLUMN "state" text;--> statement-breakpoint
ALTER TABLE "patients" ADD COLUMN "zip_code" text;--> statement-breakpoint
ALTER TABLE "patients" ADD COLUMN "mrn" text;--> statement-breakpoint
ALTER TABLE "patients" ADD COLUMN "acquisition_source" text;--> statement-breakpoint
ALTER TABLE "patients" ADD COLUMN "dosespot_patient_id" text;--> statement-breakpoint
ALTER TABLE "patients" ADD COLUMN "dosespot_sync_status" text DEFAULT 'pending' NOT NULL;--> statement-breakpoint
ALTER TABLE "patients" ADD COLUMN "dosespot_sync_error" text;--> statement-breakpoint
ALTER TABLE "patients" ADD COLUMN "dosespot_last_sync_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "patients" ADD COLUMN "updated_at" timestamp with time zone DEFAULT now() NOT NULL;--> statement-breakpoint
ALTER TABLE "providers" ADD COLUMN "title" text;--> statement-breakpoint
ALTER TABLE "providers" ADD COLUMN "specialty" text;--> statement-breakpoint
ALTER TABLE "providers" ADD COLUMN "bio" text;--> statement-breakpoint
ALTER TABLE "providers" ADD COLUMN "years_of_experience" integer;--> statement-breakpoint
ALTER TABLE "providers" ADD COLUMN "dosespot_clinician_id" text;--> statement-breakpoint
ALTER TABLE "providers" ADD COLUMN "dosespot_data" jsonb;--> statement-breakpoint
ALTER TABLE "providers" ADD COLUMN "updated_at" timestamp with time zone DEFAULT now() NOT NULL;--> statement-breakpoint
ALTER TABLE "session" ADD COLUMN "role" text;--> statement-breakpoint
ALTER TABLE "session" ADD COLUMN "permissions" jsonb DEFAULT '[]'::jsonb NOT NULL;--> statement-breakpoint
ALTER TABLE "session" ADD COLUMN "allowedModules" jsonb DEFAULT '[]'::jsonb NOT NULL;--> statement-breakpoint
ALTER TABLE "ai_action_items" ADD CONSTRAINT "ai_action_items_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ai_action_items" ADD CONSTRAINT "ai_action_items_patient_id_patients_id_fk" FOREIGN KEY ("patient_id") REFERENCES "public"."patients"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "availability" ADD CONSTRAINT "availability_provider_id_providers_id_fk" FOREIGN KEY ("provider_id") REFERENCES "public"."providers"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "broadcast_logs" ADD CONSTRAINT "broadcast_logs_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "broadcast_logs" ADD CONSTRAINT "broadcast_logs_sender_id_users_id_fk" FOREIGN KEY ("sender_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "campaigns" ADD CONSTRAINT "campaigns_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "clinical_protocols" ADD CONSTRAINT "clinical_protocols_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "community_likes" ADD CONSTRAINT "community_likes_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "community_likes" ADD CONSTRAINT "community_likes_post_id_community_posts_id_fk" FOREIGN KEY ("post_id") REFERENCES "public"."community_posts"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "community_posts" ADD CONSTRAINT "community_posts_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "community_posts" ADD CONSTRAINT "community_posts_author_id_users_id_fk" FOREIGN KEY ("author_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "community_profiles" ADD CONSTRAINT "community_profiles_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "community_replies" ADD CONSTRAINT "community_replies_post_id_community_posts_id_fk" FOREIGN KEY ("post_id") REFERENCES "public"."community_posts"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "community_replies" ADD CONSTRAINT "community_replies_author_id_users_id_fk" FOREIGN KEY ("author_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "compliance_documents" ADD CONSTRAINT "compliance_documents_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "consultations" ADD CONSTRAINT "consultations_patient_id_patients_id_fk" FOREIGN KEY ("patient_id") REFERENCES "public"."patients"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "facilities" ADD CONSTRAINT "facilities_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "grant_proposals" ADD CONSTRAINT "grant_proposals_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "imaging_orders" ADD CONSTRAINT "imaging_orders_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "imaging_orders" ADD CONSTRAINT "imaging_orders_patient_id_patients_id_fk" FOREIGN KEY ("patient_id") REFERENCES "public"."patients"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "imaging_orders" ADD CONSTRAINT "imaging_orders_provider_id_providers_id_fk" FOREIGN KEY ("provider_id") REFERENCES "public"."providers"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "lab_orders" ADD CONSTRAINT "lab_orders_patient_id_patients_id_fk" FOREIGN KEY ("patient_id") REFERENCES "public"."patients"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "lab_orders" ADD CONSTRAINT "lab_orders_provider_id_providers_id_fk" FOREIGN KEY ("provider_id") REFERENCES "public"."providers"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "messages" ADD CONSTRAINT "messages_sender_id_users_id_fk" FOREIGN KEY ("sender_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "messages" ADD CONSTRAINT "messages_recipient_id_users_id_fk" FOREIGN KEY ("recipient_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "moderation_logs" ADD CONSTRAINT "moderation_logs_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "modules" ADD CONSTRAINT "modules_parent_id_modules_id_fk" FOREIGN KEY ("parent_id") REFERENCES "public"."modules"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "permissions" ADD CONSTRAINT "permissions_module_id_modules_id_fk" FOREIGN KEY ("module_id") REFERENCES "public"."modules"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "prescriptions" ADD CONSTRAINT "prescriptions_patient_id_patients_id_fk" FOREIGN KEY ("patient_id") REFERENCES "public"."patients"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "prescriptions" ADD CONSTRAINT "prescriptions_provider_id_providers_id_fk" FOREIGN KEY ("provider_id") REFERENCES "public"."providers"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "role_permissions" ADD CONSTRAINT "role_permissions_role_id_roles_id_fk" FOREIGN KEY ("role_id") REFERENCES "public"."roles"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "role_permissions" ADD CONSTRAINT "role_permissions_permission_id_permissions_id_fk" FOREIGN KEY ("permission_id") REFERENCES "public"."permissions"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "services" ADD CONSTRAINT "services_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "shop_order_items" ADD CONSTRAINT "shop_order_items_order_id_shop_orders_id_fk" FOREIGN KEY ("order_id") REFERENCES "public"."shop_orders"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "shop_order_items" ADD CONSTRAINT "shop_order_items_product_id_shop_products_id_fk" FOREIGN KEY ("product_id") REFERENCES "public"."shop_products"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "shop_orders" ADD CONSTRAINT "shop_orders_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "shop_orders" ADD CONSTRAINT "shop_orders_patient_id_patients_id_fk" FOREIGN KEY ("patient_id") REFERENCES "public"."patients"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "shop_partners" ADD CONSTRAINT "shop_partners_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "shop_products" ADD CONSTRAINT "shop_products_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "soap_notes" ADD CONSTRAINT "soap_notes_appointment_id_appointments_id_fk" FOREIGN KEY ("appointment_id") REFERENCES "public"."appointments"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "soap_notes" ADD CONSTRAINT "soap_notes_patient_id_patients_id_fk" FOREIGN KEY ("patient_id") REFERENCES "public"."patients"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "soap_notes" ADD CONSTRAINT "soap_notes_provider_id_providers_id_fk" FOREIGN KEY ("provider_id") REFERENCES "public"."providers"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "soap_notes" ADD CONSTRAINT "soap_notes_locked_by_users_id_fk" FOREIGN KEY ("locked_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "social_posts" ADD CONSTRAINT "social_posts_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "social_posts" ADD CONSTRAINT "social_posts_author_id_users_id_fk" FOREIGN KEY ("author_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "subscriptions" ADD CONSTRAINT "subscriptions_patient_id_patients_id_fk" FOREIGN KEY ("patient_id") REFERENCES "public"."patients"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "support_tickets" ADD CONSTRAINT "support_tickets_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "support_tickets" ADD CONSTRAINT "support_tickets_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "system_settings" ADD CONSTRAINT "system_settings_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "time_sheets" ADD CONSTRAINT "time_sheets_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "time_sheets" ADD CONSTRAINT "time_sheets_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_settings" ADD CONSTRAINT "user_settings_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "vendors" ADD CONSTRAINT "vendors_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "vital_logs" ADD CONSTRAINT "vital_logs_patient_id_patients_id_fk" FOREIGN KEY ("patient_id") REFERENCES "public"."patients"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "ai_action_items_org_idx" ON "ai_action_items" USING btree ("organization_id");--> statement-breakpoint
CREATE INDEX "ai_action_items_status_idx" ON "ai_action_items" USING btree ("status");--> statement-breakpoint
CREATE INDEX "availability_provider_idx" ON "availability" USING btree ("provider_id");--> statement-breakpoint
CREATE INDEX "broadcast_logs_organization_id_idx" ON "broadcast_logs" USING btree ("organization_id");--> statement-breakpoint
CREATE INDEX "campaigns_org_idx" ON "campaigns" USING btree ("organization_id");--> statement-breakpoint
CREATE INDEX "clinical_protocols_org_idx" ON "clinical_protocols" USING btree ("organization_id");--> statement-breakpoint
CREATE UNIQUE INDEX "community_likes_uidx" ON "community_likes" USING btree ("user_id","post_id");--> statement-breakpoint
CREATE INDEX "community_posts_org_idx" ON "community_posts" USING btree ("organization_id");--> statement-breakpoint
CREATE INDEX "community_posts_author_idx" ON "community_posts" USING btree ("author_id");--> statement-breakpoint
CREATE INDEX "community_replies_post_idx" ON "community_replies" USING btree ("post_id");--> statement-breakpoint
CREATE INDEX "compliance_documents_org_idx" ON "compliance_documents" USING btree ("organization_id");--> statement-breakpoint
CREATE INDEX "compliance_documents_category_idx" ON "compliance_documents" USING btree ("category");--> statement-breakpoint
CREATE INDEX "consultations_patient_id_idx" ON "consultations" USING btree ("patient_id");--> statement-breakpoint
CREATE INDEX "dosespot_webhook_events_status_idx" ON "dosespot_webhook_events" USING btree ("status");--> statement-breakpoint
CREATE INDEX "dosespot_webhook_events_event_type_idx" ON "dosespot_webhook_events" USING btree ("event_type");--> statement-breakpoint
CREATE INDEX "dosespot_webhook_events_payload_gin_idx" ON "dosespot_webhook_events" USING gin ("payload");--> statement-breakpoint
CREATE INDEX "facilities_org_idx" ON "facilities" USING btree ("organization_id");--> statement-breakpoint
CREATE INDEX "grant_proposals_org_idx" ON "grant_proposals" USING btree ("organization_id");--> statement-breakpoint
CREATE INDEX "imaging_orders_patient_idx" ON "imaging_orders" USING btree ("patient_id");--> statement-breakpoint
CREATE INDEX "imaging_orders_org_idx" ON "imaging_orders" USING btree ("organization_id");--> statement-breakpoint
CREATE INDEX "lab_orders_patient_id_idx" ON "lab_orders" USING btree ("patient_id");--> statement-breakpoint
CREATE INDEX "lab_orders_status_idx" ON "lab_orders" USING btree ("status");--> statement-breakpoint
CREATE INDEX "messages_sender_id_idx" ON "messages" USING btree ("sender_id");--> statement-breakpoint
CREATE INDEX "messages_recipient_id_idx" ON "messages" USING btree ("recipient_id");--> statement-breakpoint
CREATE INDEX "messages_thread_id_idx" ON "messages" USING btree ("thread_id");--> statement-breakpoint
CREATE INDEX "moderation_logs_organization_id_idx" ON "moderation_logs" USING btree ("organization_id");--> statement-breakpoint
CREATE INDEX "modules_parent_id_idx" ON "modules" USING btree ("parent_id");--> statement-breakpoint
CREATE INDEX "permissions_module_id_idx" ON "permissions" USING btree ("module_id");--> statement-breakpoint
CREATE INDEX "prescriptions_patient_id_idx" ON "prescriptions" USING btree ("patient_id");--> statement-breakpoint
CREATE INDEX "prescriptions_provider_id_idx" ON "prescriptions" USING btree ("provider_id");--> statement-breakpoint
CREATE INDEX "prescriptions_dosespot_id_idx" ON "prescriptions" USING btree ("dosespot_prescription_id");--> statement-breakpoint
CREATE UNIQUE INDEX "role_permissions_role_permission_uidx" ON "role_permissions" USING btree ("role_id","permission_id");--> statement-breakpoint
CREATE INDEX "role_permissions_role_id_idx" ON "role_permissions" USING btree ("role_id");--> statement-breakpoint
CREATE INDEX "role_permissions_permission_id_idx" ON "role_permissions" USING btree ("permission_id");--> statement-breakpoint
CREATE INDEX "services_org_idx" ON "services" USING btree ("organization_id");--> statement-breakpoint
CREATE INDEX "services_category_idx" ON "services" USING btree ("category");--> statement-breakpoint
CREATE INDEX "shop_orders_patient_id_idx" ON "shop_orders" USING btree ("patient_id");--> statement-breakpoint
CREATE INDEX "shop_orders_status_idx" ON "shop_orders" USING btree ("fulfillment_status");--> statement-breakpoint
CREATE INDEX "shop_orders_organization_id_idx" ON "shop_orders" USING btree ("organization_id");--> statement-breakpoint
CREATE INDEX "shop_partners_organization_id_idx" ON "shop_partners" USING btree ("organization_id");--> statement-breakpoint
CREATE INDEX "shop_products_status_idx" ON "shop_products" USING btree ("status");--> statement-breakpoint
CREATE INDEX "shop_products_category_idx" ON "shop_products" USING btree ("category");--> statement-breakpoint
CREATE INDEX "shop_products_organization_id_idx" ON "shop_products" USING btree ("organization_id");--> statement-breakpoint
CREATE INDEX "soap_notes_appointment_id_idx" ON "soap_notes" USING btree ("appointment_id");--> statement-breakpoint
CREATE INDEX "soap_notes_patient_id_idx" ON "soap_notes" USING btree ("patient_id");--> statement-breakpoint
CREATE INDEX "social_posts_org_idx" ON "social_posts" USING btree ("organization_id");--> statement-breakpoint
CREATE INDEX "subscriptions_patient_id_idx" ON "subscriptions" USING btree ("patient_id");--> statement-breakpoint
CREATE INDEX "subscriptions_status_idx" ON "subscriptions" USING btree ("status");--> statement-breakpoint
CREATE INDEX "support_tickets_user_idx" ON "support_tickets" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "support_tickets_org_idx" ON "support_tickets" USING btree ("organization_id");--> statement-breakpoint
CREATE UNIQUE INDEX "system_settings_org_key_uidx" ON "system_settings" USING btree ("organization_id","key");--> statement-breakpoint
CREATE INDEX "time_sheets_user_idx" ON "time_sheets" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "time_sheets_org_idx" ON "time_sheets" USING btree ("organization_id");--> statement-breakpoint
CREATE UNIQUE INDEX "user_settings_user_key_uidx" ON "user_settings" USING btree ("user_id","key");--> statement-breakpoint
CREATE INDEX "vendors_org_idx" ON "vendors" USING btree ("organization_id");--> statement-breakpoint
CREATE INDEX "vital_logs_patient_type_idx" ON "vital_logs" USING btree ("patient_id","type");--> statement-breakpoint
ALTER TABLE "appointments" ADD CONSTRAINT "appointments_consultation_id_consultations_id_fk" FOREIGN KEY ("consultation_id") REFERENCES "public"."consultations"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "audit_logs" ADD CONSTRAINT "audit_logs_actor_id_users_id_fk" FOREIGN KEY ("actor_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "appointments_consultation_id_idx" ON "appointments" USING btree ("consultation_id");--> statement-breakpoint
CREATE INDEX "audit_logs_actor_id_idx" ON "audit_logs" USING btree ("actor_id");--> statement-breakpoint
CREATE INDEX "audit_logs_details_gin_idx" ON "audit_logs" USING gin ("details");--> statement-breakpoint
CREATE INDEX "patients_dosespot_id_idx" ON "patients" USING btree ("dosespot_patient_id");--> statement-breakpoint
CREATE INDEX "patients_name_trgm_idx" ON "patients" USING gist ("first_name" gist_trgm_ops,"last_name" gist_trgm_ops);--> statement-breakpoint
CREATE INDEX "patients_email_trgm_idx" ON "patients" USING gist ("email" gist_trgm_ops);--> statement-breakpoint
CREATE INDEX "providers_dosespot_id_idx" ON "providers" USING btree ("dosespot_clinician_id");--> statement-breakpoint
CREATE INDEX "users_email_idx" ON "users" USING btree ("email");