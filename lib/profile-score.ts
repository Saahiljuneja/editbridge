// Profile completion score — gamified onboarding nudge for editors.
// Pure function over data the caller already has on hand (editor row + related
// rows) — no DB access here, no new columns. Weights sum to exactly 100.

export interface ProfileScoreItem {
  key: string;
  label: string;
  points: number; // points this item is worth (or still unlocks, if incomplete)
  completed: boolean;
  actionHref: string;
}

export interface ProfileScoreResult {
  score: number;
  maxScore: number;
  items: ProfileScoreItem[];
}

export interface ProfileScoreEditorInput {
  hasPhoto: boolean;
  bio: string | null;
  // Average time (minutes) the editor takes to respond — there's no stored
  // "response rate %" field, so a fast average response time is used as the
  // closest real proxy for "responds reliably".
  avgResponseTime: number | null;
  featuredVideoUrl: string | null;
  bankAccountNumber: string | null;
}

export interface ProfileScorePackageInput {
  isActive: boolean;
}

export function calculateProfileScore(
  editor: ProfileScoreEditorInput,
  packages: ProfileScorePackageInput[],
  portfolioItems: unknown[],
  skills: unknown[],
  tools: unknown[]
): ProfileScoreResult {
  const activePackages = packages.filter((p) => p.isActive).length;
  const bioLength = editor.bio?.length ?? 0;

  let score = 0;
  const items: ProfileScoreItem[] = [];

  // Photo — 10pts
  if (editor.hasPhoto) {
    score += 10;
    items.push({ key: "photo", label: "Profile photo added", points: 10, completed: true, actionHref: "/editor/profile" });
  } else {
    items.push({ key: "photo", label: "Add a profile photo", points: 10, completed: false, actionHref: "/editor/profile" });
  }

  // Bio — 200+ chars (10pts) and 500+ chars (5pts), shown as one combined item
  if (bioLength >= 500) {
    score += 15;
    items.push({ key: "bio", label: "Bio written (500+ characters)", points: 15, completed: true, actionHref: "/editor/profile" });
  } else if (bioLength >= 200) {
    score += 10;
    items.push({ key: "bio", label: "Expand your bio to 500+ characters", points: 5, completed: false, actionHref: "/editor/profile" });
  } else {
    items.push({ key: "bio", label: "Write a bio (200+ characters)", points: 15, completed: false, actionHref: "/editor/profile" });
  }

  // Skills — 3+ (10pts)
  if (skills.length >= 3) {
    score += 10;
    items.push({ key: "skills", label: "3+ skills added", points: 10, completed: true, actionHref: "/editor/profile?tab=skills" });
  } else {
    items.push({ key: "skills", label: "Add at least 3 skills", points: 10, completed: false, actionHref: "/editor/profile?tab=skills" });
  }

  // Tools — 2+ (10pts)
  if (tools.length >= 2) {
    score += 10;
    items.push({ key: "tools", label: "2+ tools added", points: 10, completed: true, actionHref: "/editor/profile?tab=skills" });
  } else {
    items.push({ key: "tools", label: "Add at least 2 tools", points: 10, completed: false, actionHref: "/editor/profile?tab=skills" });
  }

  // Portfolio — 3+ items (15pts)
  if (portfolioItems.length >= 3) {
    score += 15;
    items.push({ key: "portfolio", label: "3+ portfolio items added", points: 15, completed: true, actionHref: "/editor/profile?tab=portfolio" });
  } else {
    items.push({ key: "portfolio", label: "Add at least 3 portfolio items", points: 15, completed: false, actionHref: "/editor/profile?tab=portfolio" });
  }

  // Packages — first package (10pts) + all 3 tiers (10pts), shown as one combined item.
  // The `tier` column on packages is unused by the current package builder (packages are
  // grouped by video category/format instead), so "tiers" is treated as "active package count".
  if (activePackages >= 3) {
    score += 20;
    items.push({ key: "packages", label: "All 3 package tiers created", points: 20, completed: true, actionHref: "/editor/packages" });
  } else if (activePackages >= 1) {
    score += 10;
    const remaining = 3 - activePackages;
    items.push({ key: "packages", label: `Create ${remaining} more package${remaining !== 1 ? "s" : ""}`, points: 10, completed: false, actionHref: "/editor/packages" });
  } else {
    items.push({ key: "packages", label: "Create your first package", points: 20, completed: false, actionHref: "/editor/packages" });
  }

  // Response time — 10pts (proxy for "response rate above 80%", see field comment above)
  if (editor.avgResponseTime != null && editor.avgResponseTime <= 120) {
    score += 10;
    items.push({ key: "response", label: "Fast response time", points: 10, completed: true, actionHref: "/editor/messages" });
  } else {
    items.push({ key: "response", label: "Respond to messages faster (avg under 2h)", points: 10, completed: false, actionHref: "/editor/messages" });
  }

  // Featured video URL — 5pts
  if (editor.featuredVideoUrl) {
    score += 5;
    items.push({ key: "video", label: "Featured video added", points: 5, completed: true, actionHref: "/editor/profile" });
  } else {
    items.push({ key: "video", label: "Add a featured video URL", points: 5, completed: false, actionHref: "/editor/profile" });
  }

  // Bank account linked — 5pts
  if (editor.bankAccountNumber) {
    score += 5;
    items.push({ key: "bank", label: "Bank account linked", points: 5, completed: true, actionHref: "/editor/payments" });
  } else {
    items.push({ key: "bank", label: "Link your bank account", points: 5, completed: false, actionHref: "/editor/payments" });
  }

  return { score, maxScore: 100, items };
}
