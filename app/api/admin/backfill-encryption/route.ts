import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { editors } from "@/lib/db/schema";
import { eq, sql } from "drizzle-orm";
import { encrypt, fieldHmac } from "@/lib/encrypt";

// GET /api/admin/backfill-encryption — admin-only, idempotent
// Encrypts any plaintext PAN / bank fields left over before AES-256-GCM was introduced.
export async function GET() {
  const session = await auth();
  if (!session || session.user.role !== "admin") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const rows = await db
    .select({
      id: editors.id,
      panNumber: editors.panNumber,
      bankAccountNumber: editors.bankAccountNumber,
      bankIfsc: editors.bankIfsc,
    })
    .from(editors)
    .where(sql`
      (${editors.panNumber} IS NOT NULL AND ${editors.panNumber} NOT LIKE 'v1:%')
      OR (${editors.bankAccountNumber} IS NOT NULL AND ${editors.bankAccountNumber} NOT LIKE 'v1:%')
      OR (${editors.bankIfsc} IS NOT NULL AND ${editors.bankIfsc} NOT LIKE 'v1:%')
    `);

  let processed = 0;
  const errors: string[] = [];
  const now = new Date();

  for (const row of rows) {
    try {
      const patch: {
        panNumber?: string;
        panNumberHash?: string;
        bankAccountNumber?: string;
        bankIfsc?: string;
        updatedAt: Date;
      } = { updatedAt: now };

      if (row.panNumber && !row.panNumber.startsWith("v1:")) {
        patch.panNumber = encrypt(row.panNumber);
        patch.panNumberHash = fieldHmac(row.panNumber);
      }
      if (row.bankAccountNumber && !row.bankAccountNumber.startsWith("v1:")) {
        patch.bankAccountNumber = encrypt(row.bankAccountNumber);
      }
      if (row.bankIfsc && !row.bankIfsc.startsWith("v1:")) {
        patch.bankIfsc = encrypt(row.bankIfsc);
      }

      await db.update(editors).set(patch).where(eq(editors.id, row.id));
      processed++;
    } catch (err) {
      errors.push(`editor ${row.id}: ${String(err)}`);
    }
  }

  return NextResponse.json({ ok: true, total: rows.length, processed, errors });
}
