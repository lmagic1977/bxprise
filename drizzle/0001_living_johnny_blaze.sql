ALTER TABLE "items" ADD COLUMN "platform" text;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "platforms" jsonb DEFAULT '[]'::jsonb NOT NULL;