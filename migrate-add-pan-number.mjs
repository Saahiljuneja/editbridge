import { neon } from "@neondatabase/serverless";
import dotenv from "dotenv";
dotenv.config({ path: ".env.local" });

const sql = neon(process.env.DATABASE_URL);

await sql`ALTER TABLE editors ADD COLUMN IF NOT EXISTS pan_number text`;

console.log("Migration complete: editors.pan_number column added");
process.exit(0);
