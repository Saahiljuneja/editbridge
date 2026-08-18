import { createHash, randomBytes } from "crypto";
import { db } from "../lib/db";
import { users } from "../lib/db/schema";
import { eq } from "drizzle-orm";

function hashPw(password: string, salt: string): string {
  return createHash("sha256").update(salt + password).digest("hex");
}

function makeHash(password: string): string {
  const salt = randomBytes(16).toString("hex");
  return `${salt}:${hashPw(password, salt)}`;
}

async function main() {
  const h = makeHash("EditBridge@2025");
  const result = await db
    .update(users)
    .set({ hashedPassword: h })
    .where(eq(users.email, "saahiljuneja45@gmail.com"))
    .returning({ id: users.id, email: users.email });
  console.log("Updated client:", JSON.stringify(result));
}

main().then(() => process.exit(0)).catch((e) => { console.error(e.message); process.exit(1); });
