export const dynamic = "force-dynamic";

import type { Metadata } from "next";
import { Suspense } from "react";
import { auth } from "@/lib/auth";
import { FeedClient } from "./feed-client";
import { Loader2 } from "lucide-react";

export const metadata: Metadata = {
  title: "Feed — EditBridge",
  description: "Discover stunning video edits, thumbnails, and motion graphics from top editors on EditBridge.",
  openGraph: {
    title: "EditBridge Feed — Editor Work & Portfolio",
    description: "Swipe through real portfolio work from verified video editors. Like, comment, and hire directly.",
    type: "website",
    siteName: "EditBridge",
  },
  twitter: {
    card: "summary_large_image",
    title: "EditBridge Feed",
    description: "Discover work from the best video editors.",
  },
};

export default async function FeedPage() {
  const session = await auth();
  return (
    // #14: 100dvh for mobile Safari (avoids address-bar overlap)
    <div style={{ height: "100dvh", overflow: "hidden" }} className="bg-black">
      <Suspense fallback={
        <div className="h-full flex items-center justify-center">
          <Loader2 className="w-8 h-8 text-white/40 animate-spin" />
        </div>
      }>
        <FeedClient
          currentUserId={session?.user?.userId ?? null}
          currentUserName={session?.user?.name ?? null}
          currentUserImage={session?.user?.image ?? null}
        />
      </Suspense>
    </div>
  );
}
