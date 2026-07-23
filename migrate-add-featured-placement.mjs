import { neon } from "@neondatabase/serverless";
import dotenv from "dotenv";
dotenv.config({ path: ".env.local" });

const sql = neon(process.env.DATABASE_URL);

await sql`ALTER TABLE editors ADD COLUMN IF NOT EXISTS is_featured boolean NOT NULL DEFAULT false`;
await sql`ALTER TABLE editors ADD COLUMN IF NOT EXISTS featured_until timestamp`;

await sql`
  CREATE TABLE IF NOT EXISTS featured_payments (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    editor_id uuid NOT NULL REFERENCES editors(id) ON DELETE CASCADE,
    duration_days integer NOT NULL,
    amount_paid integer NOT NULL,
    razorpay_payment_id text NOT NULL,
    featured_from timestamp NOT NULL,
    featured_until timestamp NOT NULL,
    created_at timestamp NOT NULL DEFAULT now()
  )
`;

console.log("Migration complete: editors.is_featured/featured_until + featured_payments table created");
process.exit(0);
