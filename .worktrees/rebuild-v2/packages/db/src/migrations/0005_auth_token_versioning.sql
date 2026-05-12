ALTER TABLE "users" ADD COLUMN "token_version" integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "token_version_updated_at" timestamp with time zone DEFAULT '1970-01-01 00:00:00+00'::timestamptz NOT NULL;--> statement-breakpoint
ALTER TABLE "session" ADD COLUMN "token_version" integer DEFAULT 0 NOT NULL;
