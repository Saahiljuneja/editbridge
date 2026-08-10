"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { KycForm } from "./kyc-form";
import { AlertCircle, RotateCcw } from "lucide-react";

export default function KycPage() {
  const router = useRouter();
  const [ready, setReady] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [retryTrigger, setRetryTrigger] = useState(0);

  useEffect(() => {
    setError(null);
    setReady(false);
    fetch("/api/kyc/status")
      .then((r) => {
        if (!r.ok) throw new Error("Failed to load KYC verification status.");
        return r.json();
      })
      .then((data) => {
        if (data.status === "pending" || data.status === "rejected") {
          router.replace("/editor/kyc/pending");
        } else if (data.status === "approved") {
          router.replace("/editor/dashboard");
        } else {
          setReady(true);
        }
      })
      .catch((err) => {
        setError(err instanceof Error ? err.message : "Failed to load KYC verification status. Please check your internet connection.");
      });
  }, [router, retryTrigger]);

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4">
        <div className="max-w-md w-full bg-white rounded-2xl border border-gray-150 p-6 text-center shadow-sm">
          <div className="w-12 h-12 rounded-full bg-red-50 flex items-center justify-center mx-auto mb-4 text-red-600">
            <AlertCircle className="w-6 h-6" />
          </div>
          <h3 className="font-bold text-gray-900 text-lg mb-2">Verification Check Failed</h3>
          <p className="text-sm text-gray-500 mb-6 leading-relaxed">
            {error}
          </p>
          <button
            onClick={() => setRetryTrigger(prev => prev + 1)}
            className="w-full inline-flex items-center justify-center gap-2 bg-black hover:bg-neutral-800 text-white font-bold py-3 px-4 rounded-xl transition-all shadow-sm"
          >
            <RotateCcw className="w-4 h-4 animate-spin-hover" />
            Try again
          </button>
        </div>
      </div>
    );
  }

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
