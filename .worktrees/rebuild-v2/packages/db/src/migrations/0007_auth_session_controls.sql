ALTER TABLE "session" ADD COLUMN "last_activity_at" timestamp DEFAULT now() NOT NULL;--> statement-breakpoint
CREATE INDEX "session_last_activity_at_idx" ON "session" USING btree ("last_activity_at");
