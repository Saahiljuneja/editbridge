import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { users, editors, skills, tools, orders } from "@/lib/db/schema";
import { onEditorProfileUpdated } from "@/lib/rewards";
import { deleteFile } from "@/lib/r2";
import { getEmbedUrl } from "@/lib/portfolio-media";
import { eq, and, inArray } from "drizzle-orm";
import { revalidatePublicPagesCache } from "@/lib/revalidate";

function keyFromUrl(url: string | null | undefined): string | null {
  if (!url) return null;
  const prefix = "/api/file/";
  return url.startsWith(prefix) ? url.slice(prefix.length) : null;
}

export async function GET() {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const [user] = await db
    .select()
    .from(users)
    .where(eq(users.id, session.user.userId!))
    .limit(1);

  if (!user) return NextResponse.json({ error: "User not found" }, { status: 404 });

  return NextResponse.json(user);
}

export async function PATCH(request: NextRequest) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await request.json();
  const {
    name, image, bio, isAvailable, skills: skillList, tools: toolList,
    displayName, title, languages,
    niches, experienceLevel, yearsOfExperience, workStyleTags, turnaround,
    maxActiveOrders, featuredVideoUrl, featuredVideoUrls, previousClients, location,
  } = body;

  // Update user fields if provided
  const userUpdates: Record<string, unknown> = { updatedAt: new Date() };
  if (name !== undefined) userUpdates.name = name || null;
  if (image !== undefined) {
    // Delete old avatar from R2 before replacing
    if (image) {
      const [current] = await db.select({ image: users.image }).from(users).where(eq(users.id, session.user.userId!)).limit(1);
      const oldKey = keyFromUrl(current?.image);
      if (oldKey) deleteFile(oldKey).catch(() => {});
    }
    userUpdates.image = image || null;
  }
  if (Object.keys(userUpdates).length > 1) {
    await db.update(users).set(userUpdates).where(eq(users.id, session.user.userId!));
  }

  // Editor-specific fields
  if (session.user.role === "editor" && session.user.editorId) {
    const hasContactInfo = (text: string): boolean => {
      const n = text
        .replace(/[٠-٩]/g, d => String(d.charCodeAt(0) - 0x0660))
        .replace(/[۰-۹]/g, d => String(d.charCodeAt(0) - 0x06F0))
        .replace(/[０-９]/g, d => String(d.charCodeAt(0) - 0xFF10))
        .toLowerCase();
      if (/[a-z0-9._%+\-]+@[a-z0-9.\-]+\.[a-z]{2,}/.test(n)) return true;
      if (/[a-z0-9]+\s*[\(\[{]?\s*at\s*[\)\]}]?\s*[a-z0-9]+\s*[\(\[{]?\s*dot\s*[\)\]}]?\s*[a-z]{2,}/.test(n)) return true;
      if (/@[a-z0-9_]{2,}/.test(n)) return true;
      if (/\b(instagram|insta|telegram|whatsapp|tiktok|twitter|snapchat|youtube|facebook|t\.me|wa\.me|fb\.com)\s*[\/:.@]\s*[a-z0-9_]+/.test(n)) return true;
      if (/\b(ig|dm|tg|wa)\s*[:@]\s*[a-z0-9_]{2,}/.test(n)) return true;
      for (let i = 0; i <= n.length; i++) {
        if ((n.slice(i, i + 30).match(/\d/g) ?? []).length >= 8) return true;
      }
      return false;
    };
    if (bio && hasContactInfo(bio))
      return NextResponse.json({ error: "Bio cannot contain contact information." }, { status: 422 });
    if (title && hasContactInfo(title))
      return NextResponse.json({ error: "Profile title cannot contain contact information." }, { status: 422 });
    if (displayName && hasContactInfo(displayName))
      return NextResponse.json({ error: "Display name cannot contain contact information." }, { status: 422 });
    if (location && hasContactInfo(location))
      return NextResponse.json({ error: "Location cannot contain contact information." }, { status: 422 });
    if (previousClients && hasContactInfo(previousClients))
      return NextResponse.json({ error: "Previously worked with cannot contain contact information." }, { status: 422 });

    // Array/tag fields that also render on the public profile — screen every entry
    // server-side so the rule can't be bypassed by calling the API directly.
    const arrayFieldsToScreen: [string, unknown][] = [
      ["Skills", skillList],
      ["Software / tools", toolList],
      ["Niche", niches],
      ["Work style", workStyleTags],
    ];
    for (const [label, arr] of arrayFieldsToScreen) {
      if (Array.isArray(arr) && arr.some((v) => typeof v === "string" && hasContactInfo(v)))
        return NextResponse.json({ error: `${label} cannot contain contact information.` }, { status: 422 });
    }
    if (Array.isArray(turnaround) && turnaround.some((t: { type?: string }) => t?.type && hasContactInfo(t.type)))
      return NextResponse.json({ error: "Turnaround time labels cannot contain contact information." }, { status: 422 });
    // Featured video must be a real YouTube, Vimeo, or Google Drive URL, not arbitrary text.
    if (featuredVideoUrl && !getEmbedUrl(String(featuredVideoUrl)))
      return NextResponse.json({ error: "Featured video must be a valid YouTube, Vimeo, or Google Drive URL." }, { status: 422 });
    if (Array.isArray(featuredVideoUrls)) {
      for (const u of featuredVideoUrls) {
        if (u && !getEmbedUrl(String(u)))
          return NextResponse.json({ error: "All featured videos must be valid YouTube, Vimeo, or Google Drive URLs." }, { status: 422 });
      }
    }

    const editorUpdates: Record<string, unknown> = { updatedAt: new Date() };
    if (bio !== undefined) editorUpdates.bio = bio || null;
    if (displayName !== undefined) editorUpdates.displayName = displayName || null;
    if (title !== undefined) editorUpdates.title = title || null;
    if (languages !== undefined) editorUpdates.languages = languages ? JSON.stringify(languages) : null;
    if (niches !== undefined) editorUpdates.niche = niches?.length ? JSON.stringify(niches) : null;
    if (experienceLevel !== undefined) editorUpdates.experienceLevel = experienceLevel || null;
    if (yearsOfExperience !== undefined) editorUpdates.yearsOfExperience = yearsOfExperience || null;
    if (workStyleTags !== undefined) editorUpdates.workStyleTags = workStyleTags?.length ? JSON.stringify(workStyleTags) : null;
    if (turnaround !== undefined) editorUpdates.turnaround = turnaround?.length ? JSON.stringify(turnaround) : null;
    if (isAvailable !== undefined) editorUpdates.isAvailable = isAvailable;
    if (maxActiveOrders !== undefined) editorUpdates.maxActiveOrders = maxActiveOrders ?? null;
    if (previousClients !== undefined) editorUpdates.previousClients = previousClients || null;
    if (location !== undefined) editorUpdates.location = location || null;
    if (featuredVideoUrl !== undefined) editorUpdates.featuredVideoUrl = featuredVideoUrl || null;
    if (Array.isArray(featuredVideoUrls)) editorUpdates.featuredVideoUrls = featuredVideoUrls.filter(Boolean);

    if (Object.keys(editorUpdates).length > 1) {
      await db
        .update(editors)
        .set(editorUpdates)
        .where(eq(editors.id, session.user.editorId));

      // Check profile completion for badge (fire-and-forget)
      onEditorProfileUpdated(session.user.userId!, session.user.editorId).catch(() => {});
    }

    // Replace skills if provided
    if (Array.isArray(skillList)) {
      await db.delete(skills).where(eq(skills.editorId, session.user.editorId));
      if (skillList.length > 0) {
        await db.insert(skills).values(
          skillList.map((name: string) => ({
            editorId: session.user.editorId!,
            name,
          }))
        );
      }
    }

    // Replace tools if provided
    if (Array.isArray(toolList)) {
      await db.delete(tools).where(eq(tools.editorId, session.user.editorId));
      if (toolList.length > 0) {
        await db.insert(tools).values(
          toolList.map((name: string) => ({
            editorId: session.user.editorId!,
            name,
          }))
        );
      }
    }
  }

  revalidatePublicPagesCache();
  return NextResponse.json({ success: true });
}

export async function DELETE() {
  const session = await auth();
  if (!session?.user?.userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const userId = session.user.userId;

  // Block deletion if user has active orders
  const activeStatuses = ["pending", "in_progress", "delivered", "revision_requested", "disputed"] as const;

  let hasActiveOrders = false;
  if (session.user.role === "client") {
    const active = await db
      .select({ id: orders.id })
      .from(orders)
      .where(and(eq(orders.clientId, userId), inArray(orders.status, activeStatuses)))
      .limit(1);
    hasActiveOrders = active.length > 0;
  } else if (session.user.role === "editor" && session.user.editorId) {
    const active = await db
      .select({ id: orders.id })
      .from(orders)
      .where(and(eq(orders.editorId, session.user.editorId), inArray(orders.status, activeStatuses)))
      .limit(1);
    hasActiveOrders = active.length > 0;
  }

  if (hasActiveOrders) {
    return NextResponse.json(
      { error: "Cannot delete account with active orders. Complete or cancel them first." },
      { status: 409 }
    );
  }

  // Cascade delete via FK constraints (users.id → cascade on all related tables)
  await db.delete(users).where(eq(users.id, userId));

  return NextResponse.json({ ok: true });
}
