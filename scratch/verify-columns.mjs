import { neon } from "@neondatabase/serverless";
import { readFileSync } from "fs";
import { fileURLToPath } from "url";
import { dirname, join } from "path";

const __dir = dirname(fileURLToPath(import.meta.url));
const envLines = readFileSync(join(__dir, "..", ".env.local"), "utf-8").split("\n");
for (const line of envLines) {
  const [k, ...rest] = line.split("=");
  if (k && rest.length) process.env[k.trim()] = rest.join("=").trim();
}

const sql = neon(process.env.DATABASE_URL);

const cols = await sql`
  SELECT column_name, data_type, column_default
  FROM information_schema.columns
  WHERE table_name = 'users'
    AND column_name IN ('login_streak_days', 'last_login_date')
`;
console.log("Columns in DB:", cols);
