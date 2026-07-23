import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { editors } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { z } from "zod";

const schema = z.object({
  accountName: z.string().min(2).max(100),
  accountNumber: z.string().min(9).max(18).regex(/^\d+$/, "Account number must be digits only"),
  ifsc: z.string().length(11).regex(/^[A-Z]{4}0[A-Z0-9]{6}$/, "Invalid IFSC code format"),
});

export async function PATCH(req: NextRequest) {
  const session = await auth();
  if (!session || session.user.role !== "editor" || !session.user.editorId)
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const body = await req.json();
  const parsed = schema.safeParse(body);
  if (!parsed.success)
    return NextResponse.json({ error: parsed.error.flatten().fieldErrors }, { status: 400 });

  const { accountName, accountNumber, ifsc } = parsed.data;

  await db
    .update(editors)
    .set({
      bankAccountName: accountName,
      bankAccountNumber: accountNumber,
      bankIfsc: ifsc.toUpperCase(),
      updatedAt: new Date(),
    })
    .where(eq(editors.id, session.user.editorId));

  return NextResponse.json({ ok: true });
}

export async function DELETE(req: NextRequest) {
  const session = await auth();
  if (!session || session.user.role !== "editor" || !session.user.editorId)
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  await db
    .update(editors)
    .set({ bankAccountName: null, bankAccountNumber: null, bankIfsc: null, updatedAt: new Date() })
    .where(eq(editors.id, session.user.editorId));

  return NextResponse.json({ ok: true });
}
