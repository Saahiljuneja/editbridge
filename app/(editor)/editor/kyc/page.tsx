"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { KycForm } from "./kyc-form";

export default function KycPage() {
  const router = useRouter();
  const [ready, setReady] = useState(false);

  useEffect(() => {
    fetch("/api/kyc/status")
      .then((r) => r.json())
      .then((data) => {
        if (data.status === "pending" || data.status === "rejected") {
          router.replace("/editor/kyc/pending");
        } else if (data.status === "approved") {
          router.replace("/editor/dashboard");
        } else {
          setReady(true);
        }
      })
      .catch(() => setReady(true));
  }, [router]);

  if (!ready) {
    return (
      <div className="px-6 py-6 animate-pulse">
        <div className="h-7 w-48 bg-gray-200 rounded-lg mb-2" />
        <div className="h-4 w-72 bg-gray-100 rounded mb-10" />
        <div className="space-y-8">
          <div className="space-y-3">
            <div className="h-5 w-32 bg-gray-200 rounded" />
            <div className="grid grid-cols-3 gap-3">
              {[1, 2, 3].map((i) => <div key={i} className="h-10 bg-gray-100 rounded-lg" />)}
            </div>
          </div>
          <div className="h-32 bg-gray-100 rounded-xl border border-dashed border-gray-200" />
          <div className="h-32 bg-gray-100 rounded-xl border border-dashed border-gray-200" />
          <div className="h-12 bg-gray-200 rounded-xl" />
        </div>
      </div>
    );
  }

  return <KycForm />;
}
