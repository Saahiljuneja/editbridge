export const dynamic = "force-dynamic";

import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { editors, users, skills, tools, portfolioItems, kycApplications, packages } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { calculateProfileScore } from "@/lib/profile-score";
import { ProfileClient } from "./profile-client";
import { getActiveBoosts } from "@/lib/xp-shop";
import { PROFILE_FRAMES } from "@/lib/xp-shop-config";
import { toPortfolioProxyUrl } from "@/lib/portfolio-url";
import { getPlatformSettings } from "@/lib/platform-settings";

export default async function ProfilePage() {
  const session = await auth();
  if (!session || session.user?.role !== "editor") redirect("/login");

  const editorId = session.user.editorId;
  if (!editorId) redirect("/editor/kyc");

  const userId = session.user.userId!;

  const [userRow, editor, skillRows, toolRows, portfolioRows, kycRow, packageRows, activeBoosts, { maxFileSizeMb }] = await Promise.all([
    db.select({ image: users.image }).from(users).where(eq(users.id, userId)).limit(1).then(r => r[0]),
    db.select({
      bio: editors.bio,
      displayName: editors.displayName,
      title: editors.title,
      languages: editors.languages,
      niche: editors.niche,
      experienceLevel: editors.experienceLevel,
      yearsOfExperience: editors.yearsOfExperience,
      workStyleTags: editors.workStyleTags,
      turnaround: editors.turnaround,
      faqs: editors.faqs,
      isAvailable: editors.isAvailable,
      vacationUntil: editors.vacationUntil,
      location: editors.location,
      previousClients: editors.previousClients,
      maxActiveOrders: editors.maxActiveOrders,
      coverImage: editors.coverImage,
      featuredVideoUrl: editors.featuredVideoUrl,
      totalOrders: editors.totalOrders,
      completionRate: editors.completionRate,
      avgResponseTime: editors.avgResponseTime,
      createdAt: editors.createdAt,
      kycStatus: editors.kycStatus,
      bankAccountNumber: editors.bankAccountNumber,
      activeFrame: editors.activeFrame,
    }).from(editors).where(eq(editors.id, editorId)).limit(1).then((r) => r[0]),

    db.select({ name: skills.name }).from(skills).where(eq(skills.editorId, editorId)),
    db.select({ name: tools.name }).from(tools).where(eq(tools.editorId, editorId)),
    db.select().from(portfolioItems).where(eq(portfolioItems.editorId, editorId)).orderBy(portfolioItems.createdAt),

    db.select({ status: kycApplications.status })
      .from(kycApplications).where(eq(kycApplications.editorId, editorId)).limit(1).then((r) => r[0]),
    db.select().from(packages).where(eq(packages.editorId, editorId)),
    getActiveBoosts(userId),
    getPlatformSettings(),
  ]);

  const ownedFrames = activeBoosts
    .filter(b => PROFILE_FRAMES.some(f => f.key === b.type))
    .map(b => b.type);

  const profileScore = calculateProfileScore(
    {
      hasPhoto: !!userRow?.image,
      bio: editor?.bio ?? null,
      avgResponseTime: editor?.avgResponseTime ?? null,
      featuredVideoUrl: editor?.featuredVideoUrl ?? null,
      bankAccountNumber: editor?.bankAccountNumber ?? null,
    },
    packageRows,
    portfolioRows,
    skillRows,
    toolRows
  );

  const parseJson = <T,>(raw: string | null | undefined, fallback: T): T => {
    if (!raw) return fallback;
    try { return JSON.parse(raw) as T; } catch { return fallback; }
  };

  return (
    <ProfileClient
      editorId={editorId}
      userName={session.user.name ?? ""}
      userImage={userRow?.image ?? null}
      userEmail={session.user.email ?? ""}
      initialBio={editor?.bio ?? ""}
      initialDisplayName={editor?.displayName ?? ""}
      initialTitle={editor?.title ?? ""}
      initialLanguages={parseJson(editor?.languages, [])}
      initialNiches={(() => {
        const raw = editor?.niche;
        if (!raw) return [];
        try { const p = JSON.parse(raw); return Array.isArray(p) ? p : [raw]; } catch { return [raw]; }
      })()}
      initialExperienceLevel={editor?.experienceLevel ?? ""}
      initialYearsOfExperience={editor?.yearsOfExperience ?? null}
      initialWorkStyleTags={parseJson(editor?.workStyleTags, [])}
      initialTurnaround={parseJson(editor?.turnaround, [])}
      initialFaqs={parseJson(editor?.faqs, [])}
      initialSkills={skillRows.map((s) => s.name)}
      initialTools={toolRows.map((t) => t.name)}
      initialIsAvailable={editor?.isAvailable ?? true}
      initialVacationUntil={editor?.vacationUntil ?? null}
      initialLocation={editor?.location ?? ""}
      initialPreviousClients={editor?.previousClients ?? ""}
      initialMaxActiveOrders={editor?.maxActiveOrders ?? null}
      initialCoverImage={editor?.coverImage ?? null}
      initialFeaturedVideoUrl={editor?.featuredVideoUrl ?? ""}
      initialPortfolio={portfolioRows.map((p) => {
        const r2Base = (process.env.R2_PUBLIC_URL ?? "").replace(/\/$/, "");
        const toProxy = (raw: string | null) => toPortfolioProxyUrl(raw, r2Base);
        return {
        id: p.id,
        type: p.type as "video" | "image",
        url: toProxy(p.url) ?? p.url,
        beforeUrl: toProxy(p.beforeUrl ?? null),
        thumbnailUrl: toProxy(p.thumbnailUrl ?? null),
        likesCount: p.likesCount,
        commentsCount: p.commentsCount,
        viewsCount: p.viewsCount,
        title: p.title ?? null,
        description: p.description ?? null,
        category: p.category ?? null,
        tags: (p.tags as string[]) ?? [],
        isFeatured: p.isFeatured,
        isHidden: p.isHidden,
        sortOrder: p.sortOrder,
        orderId: p.orderId ?? null,
        createdAt: p.createdAt?.toISOString(),
        }; })}
      kycStatus={kycRow?.status ?? null}
      profileScore={profileScore.score}
      profileMaxScore={profileScore.maxScore}
      profileScoreItems={profileScore.items}
      totalOrders={editor?.totalOrders ?? 0}
      completionRate={editor?.completionRate ?? null}
      ownedFrames={ownedFrames}
      activeFrame={editor?.activeFrame ?? null}
      maxFileSizeMb={maxFileSizeMb}
    />
  );
}
