import { NextResponse } from "next/server";
import { getAllFeatureFlags } from "@/lib/feature-flags";

// Public — on/off state isn't sensitive, and client-side nav (mobile menu)
// needs it to decide whether to show a link to a disabled feature.
export async function GET() {
  const flags = await getAllFeatureFlags();
  const map: Record<string, boolean> = {};
  for (const f of flags) map[f.key] = f.enabled;
  return NextResponse.json({ flags: map });
}
