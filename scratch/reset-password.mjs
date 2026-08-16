import { neon } from "@neondatabase/serverless";
import { createHash, randomBytes } from "crypto";
import dotenv from "dotenv";
dotenv.config({ path: ".env.local" });

const sql = neon(process.env.DATABASE_URL);

// ── SET THESE ──────────────────────────────────────────────
const TARGET_EMAIL = "saahiljuneja45@gmail.com"; // account email
const NEW_PASSWORD = "EditBridge@2025";          // new password
// ──────────────────────────────────────────────────────────

function hashPwd(password, salt) {
  return createHash("sha256").update(salt + password).digest("hex");
}

const salt = randomBytes(16).toString("hex");
const hashed = `${salt}:${hashPwd(NEW_PASSWORD, salt)}`;

await sql`UPDATE users SET hashed_password = ${hashed}, updated_at = NOW() WHERE email = ${TARGET_EMAIL}`;

console.log(`✅ Password reset for: ${TARGET_EMAIL}`);
console.log(`   New password: ${NEW_PASSWORD}`);
console.log("\n⚠️  Delete this file after logging in!");
process.exit(0);
