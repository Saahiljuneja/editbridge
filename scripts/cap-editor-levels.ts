import { db } from "../lib/db";
import { userPoints } from "../lib/db/schema";
import { inArray } from "drizzle-orm";

async function main() {
  const result = await db
    .update(userPoints)
    .set({ level: "level4" })
    .where(inArray(userPoints.level, ["level5", "level6", "level7"]))
    .returning({ id: userPoints.id, userId: userPoints.userId });

  console.log(`Updated ${result.length} rows to level4:`, JSON.stringify(result));
}

main().then(() => process.exit(0)).catch((e) => { console.error(e.message); process.exit(1); });
