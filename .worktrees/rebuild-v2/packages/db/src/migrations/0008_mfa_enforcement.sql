ALTER TABLE "users" ADD COLUMN "twoFactorEnabled" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "twoFactor" ADD COLUMN "verified" boolean DEFAULT true NOT NULL;
