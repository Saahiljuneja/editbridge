"use client";

import { useEffect } from "react";
import { usePathname, useRouter } from "next/navigation";
import type { KYCStatus } from "@/types";

type GuardStatus = KYCStatus | "not_submitted" | "expired";

export function EditorKycGuard({
  kycStatus,
  children,
}: {
  kycStatus: GuardStatus;
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const router = useRouter();

  useEffect(() => {
    // Not submitted yet — allow dashboard access, banner handles the prompt
    if (kycStatus === "not_submitted") return;

    // Submitted and awaiting review
    if (kycStatus === "pending") {
      if (!pathname.startsWith("/editor/kyc")) {
        router.replace("/editor/kyc/pending");
      }
      return;
    }

    // Rejected or expired — send back to KYC resubmit form
    if (kycStatus === "rejected" || kycStatus === "expired") {
      if (!pathname.startsWith("/editor/kyc")) {
        router.replace("/editor/kyc/resubmit");
      }
      return;
    }

    // approved — no restriction
  }, [kycStatus, pathname, router]);

  return <>{children}</>;
}
