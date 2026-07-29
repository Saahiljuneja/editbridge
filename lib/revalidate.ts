import { revalidateTag } from "next/cache";

/**
 * Revalidates the cached public pages that list editors or showcase items.
 * Call this whenever:
 *  - Editor updates their profile settings (displayName, tools, bio, location, featured video).
 *  - Editor creates, updates, or deletes their packages.
 *  - Editor adds, edits, or deletes portfolio items.
 *  - Editor's KYC status is approved/updated by an admin.
 */
export function revalidatePublicPagesCache() {
  try {
    revalidateTag("homepage-data", { expire: 0 });
    revalidateTag("category-editors-data", { expire: 0 });
  } catch (error) {
    console.error("Failed to revalidate public page caches:", error);
  }
}
