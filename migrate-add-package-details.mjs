import { neon } from "@neondatabase/serverless";
import "dotenv/config";

const sql = neon(process.env.DATABASE_URL);

await sql`ALTER TABLE packages ADD COLUMN IF NOT EXISTS software_used text[] NOT NULL DEFAULT '{}'`;
await sql`ALTER TABLE packages ADD COLUMN IF NOT EXISTS max_raw_footage text`;
await sql`ALTER TABLE packages ADD COLUMN IF NOT EXISTS delivery_formats text[] NOT NULL DEFAULT '{}'`;

console.log("Migration complete: software_used, max_raw_footage, delivery_formats added to packages");
