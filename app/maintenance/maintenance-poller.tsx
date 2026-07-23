"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

export function MaintenancePoller() {
  const router = useRouter();

  useEffect(() => {
    const id = setInterval(async () => {
      try {
        const res = await fetch("/api/maintenance-check", { cache: "no-store" });
        if (!res.ok) return;
        const data = await res.json() as { on?: boolean };
        if (!data.on) {
          router.replace("/");
        }
      } catch {
        // network error — keep polling
      }
    }, 10_000);

    return () => clearInterval(id);
  }, [router]);

  return null;
}
