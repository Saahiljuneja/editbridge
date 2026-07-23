import { neon } from "@neondatabase/serverless";
import dotenv from "dotenv";
dotenv.config({ path: ".env.local" });

const sql = neon(process.env.DATABASE_URL);

await sql`
  DO $$ BEGIN
    CREATE TYPE quote_status AS ENUM ('pending', 'offered', 'accepted', 'paid', 'declined', 'expired');
  EXCEPTION
    WHEN duplicate_object THEN null;
  END $$;
`;

await sql`
  CREATE TABLE IF NOT EXISTS quote_requests (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    client_id uuid NOT NULL REFERENCES users(id),
    editor_id uuid NOT NULL REFERENCES editors(id),
    video_type text NOT NULL,
    brief text NOT NULL,
    budget_min integer NOT NULL,
    budget_max integer NOT NULL,
    deadline_preference text NOT NULL DEFAULT 'flexible',
    reference_url text,
    status quote_status NOT NULL DEFAULT 'pending',
    offered_price integer,
    offer_message text,
    order_id uuid REFERENCES orders(id),
    expires_at timestamp NOT NULL,
    created_at timestamp NOT NULL DEFAULT now(),
    updated_at timestamp NOT NULL DEFAULT now()
  )
`;

console.log("Migration complete: quote_status enum + quote_requests table created");
process.exit(0);
