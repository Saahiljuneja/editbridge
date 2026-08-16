// Adds the two missing columns to the users table and fixes the
// user_preferences unique constraint without requiring a TTY.
import { neon } from "@neondatabase/serverless";
import { readFileSync } from "fs";
import { fileURLToPath } from "url";
import { dirname, join } from "path";

// Load .env.local manually
const __dir = dirname(fileURLToPath(import.meta.url));
const envPath = join(__dir, "..", ".env.local");
const envLines = readFileSync(envPath, "utf-8").split("\n");
for (const line of envLines) {
  const [k, ...rest] = line.split("=");
  if (k && rest.length) process.env[k.trim()] = rest.join("=").trim();
}

const sql = neon(process.env.DATABASE_URL);

async function run() {
  // Add login_streak_days if not exists
  await sql`
    ALTER TABLE users
    ADD COLUMN IF NOT EXISTS login_streak_days integer NOT NULL DEFAULT 0
  `;
  console.log("✓ login_streak_days column ensured");

  // Add last_login_date if not exists
  await sql`
    ALTER TABLE users
    ADD COLUMN IF NOT EXISTS last_login_date text
  `;
  console.log("✓ last_login_date column ensured");

  // Add unique constraint on user_preferences.user_id if not exists
  const [row] = await sql`
    SELECT 1 FROM pg_constraint
    WHERE conname = 'user_preferences_user_id_unique'
  `;
  if (!row) {
    await sql`
      ALTER TABLE user_preferences
      ADD CONSTRAINT user_preferences_user_id_unique UNIQUE (user_id)
    `;
    console.log("✓ user_preferences_user_id_unique constraint added");
  } else {
    console.log("✓ user_preferences_user_id_unique constraint already exists");
  }

  console.log("\nAll done — login should now work.");
}

run().catch(err => { console.error("Migration failed:", err); process.exit(1); });
