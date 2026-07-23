import { neon } from "@neondatabase/serverless";
import dotenv from "dotenv";
dotenv.config({ path: ".env.local" });

const sql = neon(process.env.DATABASE_URL);

await sql`
  CREATE TABLE IF NOT EXISTS nudge_logs (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    nudge_type text NOT NULL,
    period_key text NOT NULL,
    sent_at timestamp NOT NULL DEFAULT now(),
    UNIQUE (user_id, nudge_type, period_key)
  )
`;

console.log("Migration complete: nudge_logs table created");
process.exit(0);
