import { db } from "@/lib/db";
import { users } from "@/lib/db/schema";
import { isNull } from "drizzle-orm";

async function main() {
  const result = await db
    .update(users)
    .set({ emailVerified: new Date() })
    .where(isNull(users.emailVerified))
    .returning({ email: users.email });

  console.log(`Marked ${result.length} existing user(s) as verified:`);
  result.forEach((u) => console.log(" ", u.email));
  process.exit(0);
}

main().catch((e) => { console.error(e); process.exit(1); });
