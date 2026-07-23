import { db } from "@/lib/db";
import { portfolioItems } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { deleteFile } from "@/lib/r2";

interface PortfolioFileRow {
  url: string;
  beforeUrl: string | null;
  thumbnailUrl: string | null;
}

function toR2Key(value: string | null | undefined): string | null {
  if (!value) return null;
  if (/^https?:\/\//i.test(value)) return null; // external (YouTube/Vimeo) — nothing to delete
  const prefix = "/api/file/";
  return value.startsWith(prefix) ? value.slice(prefix.length) : value;
}

// Call AFTER the rows have already been deleted from the DB. Duplicated portfolio
// items can point at the same R2 key as their source, so this re-checks what's
// still referenced by the editor's remaining items before deleting anything.
export async function cleanupOrphanedPortfolioFiles(editorId: string, deletedRows: PortfolioFileRow[]) {
  const candidateKeys = new Set<string>();
  for (const row of deletedRows) {
    for (const value of [row.url, row.beforeUrl, row.thumbnailUrl]) {
      const key = toR2Key(value);
      if (key) candidateKeys.add(key);
    }
  }
  if (candidateKeys.size === 0) return;

  const remaining = await db
    .select({ url: portfolioItems.url, beforeUrl: portfolioItems.beforeUrl, thumbnailUrl: portfolioItems.thumbnailUrl })
    .from(portfolioItems)
    .where(eq(portfolioItems.editorId, editorId));

  const stillReferenced = new Set<string>();
  for (const row of remaining) {
    for (const value of [row.url, row.beforeUrl, row.thumbnailUrl]) {
      const key = toR2Key(value);
      if (key) stillReferenced.add(key);
    }
  }

  for (const key of candidateKeys) {
    if (!stillReferenced.has(key)) deleteFile(key).catch(() => {});
  }
}
