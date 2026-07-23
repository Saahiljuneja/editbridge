import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { packages, editors } from "@/lib/db/schema";
import { and, eq } from "drizzle-orm";

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  const editorRow = await db
    .select({ id: editors.id })
    .from(editors)
    .where(and(eq(editors.id, id), eq(editors.kycStatus, "approved")))
    .limit(1)
    .then((r) => r[0]);

  if (!editorRow) {
    return NextResponse.json({ error: "Editor not found" }, { status: 404 });
  }

  const pkgs = await db
    .select()
    .from(packages)
    .where(and(eq(packages.editorId, id), eq(packages.isActive, true)));

  return NextResponse.json({ packages: pkgs });
}
