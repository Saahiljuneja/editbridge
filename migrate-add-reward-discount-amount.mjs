import { neon } from "@neondatabase/serverless";
import dotenv from "dotenv";
dotenv.config({ path: ".env.local" });

const sql = neon(process.env.DATABASE_URL);

// This column was added to schema.ts in an earlier session but the migration
// was never run — orders.reward_discount_amount was missing from the live DB.
await sql`ALTER TABLE orders ADD COLUMN IF NOT EXISTS reward_discount_amount integer NOT NULL DEFAULT 0`;

console.log("Migration complete: orders.reward_discount_amount added");
process.exit(0);
