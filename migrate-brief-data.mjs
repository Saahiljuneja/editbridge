import { neon } from "@neondatabase/serverless";
import dotenv from "dotenv";
dotenv.config({ path: ".env.local" });

const sql = neon(process.env.DATABASE_URL);
await sql`ALTER TABLE orders ADD COLUMN IF NOT EXISTS brief_data jsonb`;
console.log("Migration complete: orders.brief_data added");
process.exit(0);
