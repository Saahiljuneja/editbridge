import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { editors } from "@/lib/db/schema";
import { deleteFile } from "@/lib/r2";
import { eq } from "drizzle-orm";
import { z } from "zod";
import { revalidatePublicPagesCache } from "@/lib/revalidate";

function keyFromUrl(url: string | null | undefined): string | null {
  if (!url) return null;
  const prefix = "/api/file/";
  return url.startsWith(prefix) ? url.slice(prefix.length) : null;
}

const updateSchema = z.object({
  displayName: z.string().max(100).optional(),
  title: z.string().max(120).optional(),
  bio: z.string().max(2000).optional(),
  location: z.string().max(100).optional(),
  coverImage: z.string().max(1000).nullable().optional(),
  featuredVideoUrl: z.string().url("Invalid URL").max(500).nullable().optional(),
  panNumber: z.string().regex(/^[A-Z]{5}[0-9]{4}[A-Z]$/, "Invalid PAN format (e.g. ABCDE1234F)").nullable().optional(),
});

export async function GET() {
  const session = await auth();
  if (!session || session.user?.role !== "editor" || !session.user.editorId)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const [row] = await db
    .select({
      displayName: editors.displayName,
      title: editors.title,
      bio: editors.bio,
      location: editors.location,
      coverImage: editors.coverImage,
      featuredVideoUrl: editors.featuredVideoUrl,
      bankAccountName: editors.bankAccountName,
      bankAccountNumber: editors.bankAccountNumber,
      bankIfsc: editors.bankIfsc,
      panNumber: editors.panNumber,
    })
    .from(editors)
    .where(eq(editors.id, session.user.editorId))
    .limit(1);

  return NextResponse.json(row ?? {});
}

export async function PATCH(req: NextRequest) {
  const session = await auth();
  if (!session || session.user?.role !== "editor" || !session.user.editorId)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json();
  const parsed = updateSchema.safeParse(body);
  if (!parsed.success)
    return NextResponse.json({ error: parsed.error.flatten().fieldErrors }, { status: 400 });

  // Delete old cover image from R2 when replacing or removing
  if ("coverImage" in parsed.data) {
    const [current] = await db.select({ coverImage: editors.coverImage }).from(editors).where(eq(editors.id, session.user.editorId)).limit(1);
    const oldKey = keyFromUrl(current?.coverImage);
    if (oldKey) deleteFile(oldKey).catch(() => {});
  }

  await db
    .update(editors)
    .set({ ...parsed.data, updatedAt: new Date() })
    .where(eq(editors.id, session.user.editorId));

  revalidatePublicPagesCache();
  return NextResponse.json({ ok: true });
}
