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

  const onKycPath = pathname.startsWith("/editor/kyc");

  const redirectTo =
    kycStatus === "pending" && !onKycPath
      ? "/editor/kyc/pending"
      : (kycStatus === "rejected" || kycStatus === "expired") && !onKycPath
        ? "/editor/kyc/resubmit"
        : null;

  useEffect(() => {
    if (redirectTo) router.replace(redirectTo);
  }, [redirectTo, router]);

  if (redirectTo) return null;
  return <>{children}</>;
}
