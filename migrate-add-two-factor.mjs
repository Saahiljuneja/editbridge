import { neon } from "@neondatabase/serverless";
import dotenv from "dotenv";
dotenv.config({ path: ".env.local" });

const sql = neon(process.env.DATABASE_URL);

await sql`ALTER TABLE users ADD COLUMN IF NOT EXISTS two_factor_enabled boolean NOT NULL DEFAULT false`;
await sql`ALTER TABLE users ADD COLUMN IF NOT EXISTS two_factor_secret text`;
await sql`ALTER TABLE users ADD COLUMN IF NOT EXISTS two_factor_backup_codes text[]`;
await sql`ALTER TABLE users ADD COLUMN IF NOT EXISTS two_factor_verified_at timestamp`;

console.log("Migration complete: two-factor authentication columns added to users");
process.exit(0);
