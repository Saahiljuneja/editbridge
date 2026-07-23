import { neon } from "@neondatabase/serverless";
import dotenv from "dotenv";
dotenv.config({ path: ".env.local" });

const sql = neon(process.env.DATABASE_URL);

await sql`DO $$ BEGIN
  CREATE TYPE extension_status AS ENUM ('pending', 'approved', 'rejected');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$`;

await sql`ALTER TABLE orders ADD COLUMN IF NOT EXISTS extension_requested_at timestamp`;
await sql`ALTER TABLE orders ADD COLUMN IF NOT EXISTS extension_reason text`;
await sql`ALTER TABLE orders ADD COLUMN IF NOT EXISTS extension_days integer`;
await sql`ALTER TABLE orders ADD COLUMN IF NOT EXISTS extension_status extension_status`;
await sql`ALTER TABLE orders ADD COLUMN IF NOT EXISTS original_deadline timestamp`;

console.log("Migration complete: order extension columns added");
process.exit(0);
