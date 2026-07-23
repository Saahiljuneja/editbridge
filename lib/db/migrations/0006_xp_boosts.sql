CREATE TABLE "xp_boosts" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "user_id" uuid NOT NULL REFERENCES "users"("id") ON DELETE CASCADE,
  "type" text NOT NULL,
  "expires_at" timestamp,
  "purchased_at" timestamp NOT NULL DEFAULT now()
);
