ALTER TABLE "editors" ADD COLUMN "revision_scope_note" text;--> statement-breakpoint
ALTER TABLE "orders" ADD COLUMN "reward_discount_amount" integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE "packages" ADD COLUMN "revision_extension_days" integer DEFAULT 2 NOT NULL;