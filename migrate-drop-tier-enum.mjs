import { neon } from "@neondatabase/serverless";
import dotenv from "dotenv";
dotenv.config({ path: ".env.local" });

const sql = neon(process.env.DATABASE_URL);

// 1. Cast enum column to plain text (preserves existing "basic"/"standard"/"premium" values)
await sql`ALTER TABLE packages ALTER COLUMN tier TYPE varchar USING tier::varchar`;

// 2. Drop the NOT NULL constraint so new packages can omit tier
await sql`ALTER TABLE packages ALTER COLUMN tier DROP NOT NULL`;

// 3. Drop the enum type (no longer referenced)
await sql`DROP TYPE IF EXISTS package_tier`;

console.log("Migration complete: packages.tier is now nullable varchar, package_tier enum dropped");
process.exit(0);
