// Adds membershipTier + membershipExpiresAt to editors, and creates membership_payments table.
import { neon } from "@neondatabase/serverless";
import { readFileSync } from "fs";
import { fileURLToPath } from "url";
import { dirname, join } from "path";

const __dir = dirname(fileURLToPath(import.meta.url));
const envPath = join(__dir, "..", ".env.local");
const envLines = readFileSync(envPath, "utf-8").split("\n");
for (const line of envLines) {
  const [k, ...rest] = line.split("=");
  if (k && rest.length) process.env[k.trim()] = rest.join("=").trim();
}

const sql = neon(process.env.DATABASE_URL);

async function run() {
  // 1. membership_tier column on editors
  await sql`
    ALTER TABLE editors
    ADD COLUMN IF NOT EXISTS membership_tier text NOT NULL DEFAULT 'hobby'
  `;
  console.log("✓ editors.membership_tier");

  // 2. membership_expires_at column on editors
  await sql`
    ALTER TABLE editors
    ADD COLUMN IF NOT EXISTS membership_expires_at timestamp
  `;
  console.log("✓ editors.membership_expires_at");

  // 3. membership_payments table
  await sql`
    CREATE TABLE IF NOT EXISTS membership_payments (
      id          uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
      editor_id   uuid        NOT NULL REFERENCES editors(id) ON DELETE CASCADE,
      tier        text        NOT NULL,
      amount_paid integer     NOT NULL,
      razorpay_order_id   text NOT NULL,
      razorpay_payment_id text,
      status      text        NOT NULL DEFAULT 'pending',
      expires_at  timestamp   NOT NULL,
      created_at  timestamp   NOT NULL DEFAULT now()
    )
  `;
  console.log("✓ membership_payments table");

  console.log("\nMembership migration complete.");
}

run().catch(err => { console.error("Migration failed:", err); process.exit(1); });
