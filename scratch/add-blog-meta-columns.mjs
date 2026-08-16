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
  await sql`ALTER TABLE blog_posts ADD COLUMN IF NOT EXISTS og_image_url text`;
  console.log("✓ og_image_url column ensured");

  await sql`ALTER TABLE blog_posts ADD COLUMN IF NOT EXISTS twitter_card_type text DEFAULT 'summary_large_image'`;
  console.log("✓ twitter_card_type column ensured");

  await sql`ALTER TABLE blog_posts ADD COLUMN IF NOT EXISTS canonical_url text`;
  console.log("✓ canonical_url column ensured");

  console.log("\nBlog meta columns migration complete.");
}

run().catch(err => { console.error("Migration failed:", err); process.exit(1); });
