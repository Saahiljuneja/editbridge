CREATE TYPE "public"."quote_status" AS ENUM('pending', 'offered', 'accepted', 'paid', 'declined', 'expired');--> statement-breakpoint
CREATE TABLE "quote_requests" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"client_id" uuid NOT NULL,
	"editor_id" uuid NOT NULL,
	"video_type" text NOT NULL,
	"brief" text NOT NULL,
	"budget_min" integer NOT NULL,
	"budget_max" integer NOT NULL,
	"deadline_preference" text DEFAULT 'flexible' NOT NULL,
	"reference_url" text,
	"status" "quote_status" DEFAULT 'pending' NOT NULL,
	"offered_price" integer,
	"offer_message" text,
	"order_id" uuid,
	"expires_at" timestamp NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "quote_requests" ADD CONSTRAINT "quote_requests_client_id_users_id_fk" FOREIGN KEY ("client_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "quote_requests" ADD CONSTRAINT "quote_requests_editor_id_editors_id_fk" FOREIGN KEY ("editor_id") REFERENCES "public"."editors"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "quote_requests" ADD CONSTRAINT "quote_requests_order_id_orders_id_fk" FOREIGN KEY ("order_id") REFERENCES "public"."orders"("id") ON DELETE no action ON UPDATE no action;