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
  // Add 'in-review' to the blog_post_status enum
  await sql`ALTER TYPE blog_post_status ADD VALUE IF NOT EXISTS 'in-review'`;
  console.log("✓ 'in-review' value ensured in blog_post_status enum");

  // Add admin_reply column to blog_comments
  await sql`ALTER TABLE blog_comments ADD COLUMN IF NOT EXISTS admin_reply text`;
  console.log("✓ admin_reply column ensured in blog_comments");

  // Add is_pinned column to blog_comments
  await sql`ALTER TABLE blog_comments ADD COLUMN IF NOT EXISTS is_pinned boolean NOT NULL DEFAULT false`;
  console.log("✓ is_pinned column ensured in blog_comments");

  console.log("\nComment fields migration complete.");
}

run().catch(err => { console.error("Migration failed:", err); process.exit(1); });
