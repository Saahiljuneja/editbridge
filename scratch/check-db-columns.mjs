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

const dbUrl = process.env.DATABASE_URL;
try {
  const parsed = new URL(dbUrl);
  console.log("Host:", parsed.hostname);
  console.log("DB path:", parsed.pathname);
} catch {
  console.log("DATABASE_URL parse failed");
}

const sql = neon(dbUrl);
const result = await sql`
  SELECT column_name
  FROM information_schema.columns
  WHERE table_name = 'blog_posts'
  AND column_name IN ('og_image_url', 'twitter_card_type', 'canonical_url')
`;
console.log("Columns found in DB:", result.map(r => r.column_name));
