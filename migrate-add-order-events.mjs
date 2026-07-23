import { neon } from "@neondatabase/serverless";
import dotenv from "dotenv";
dotenv.config({ path: ".env.local" });

const sql = neon(process.env.DATABASE_URL);

await sql`
  DO $$ BEGIN
    CREATE TYPE order_event_type AS ENUM (
      'order_placed',
      'delivery_uploaded',
      'revision_requested',
      'extension_requested',
      'extension_approved',
      'extension_rejected',
      'dispute_opened',
      'dispute_resolved',
      'order_completed',
      'order_cancelled',
      'payout_scheduled',
      'message_flagged'
    );
  EXCEPTION
    WHEN duplicate_object THEN null;
  END $$
`;

await sql`
  CREATE TABLE IF NOT EXISTS order_events (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    order_id uuid NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
    actor_id uuid REFERENCES users(id),
    event_type order_event_type NOT NULL,
    metadata jsonb DEFAULT '{}',
    created_at timestamp NOT NULL DEFAULT now()
  )
`;

console.log("Migration complete: order_events table created");
process.exit(0);
