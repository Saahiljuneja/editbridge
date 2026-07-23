"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { KycForm } from "../kyc-form";
import { AlertCircle, ImageIcon } from "lucide-react";

interface PreviousDocs {
  documentType: string;
  documentUrl: string;
  documentBackUrl: string | null;
  panDocumentUrl: string | null;
  selfieUrl: string | null;
}

function DocThumb({ url, label }: { url: string; label: string }) {
  return (
    <div className="flex flex-col items-center gap-1">
      <a href={url} target="_blank" rel="noopener noreferrer"
        className="w-20 h-20 rounded-lg border border-gray-200 bg-gray-50 overflow-hidden flex items-center justify-center hover:opacity-80 transition-opacity cursor-zoom-in">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={url}
          alt={label}
          className="w-full h-full object-cover"
          onError={(e) => {
            (e.target as HTMLImageElement).replaceWith(
              Object.assign(document.createElement("span"), { className: "text-gray-300 text-xs text-center p-2", textContent: "No preview" })
            );
          }}
        />
      </a>
      <span className="text-[10px] text-gray-400 text-center leading-tight">{label}</span>
    </div>
  );
}

export default function KycResubmitPage() {
  const router = useRouter();
  const [ready, setReady] = useState(false);
  const [rejectionReason, setRejectionReason] = useState<string | null>(null);
  const [previousDocs, setPreviousDocs] = useState<PreviousDocs | null>(null);

  useEffect(() => {
    fetch("/api/kyc/status")
      .then((r) => r.json())
      .then((data) => {
        if (data.status === "approved") {
          router.replace("/editor/dashboard");
        } else if (data.status === "pending") {
          router.replace("/editor/kyc/pending");
        } else {
          setRejectionReason(data.rejectionReason ?? null);
          setPreviousDocs(data.previousDocs ?? null);
          setReady(true);
        }
      })
      .catch(() => setReady(true));
  }, [router]);

  if (!ready) {
    return (
      <div className="px-8 py-6 animate-pulse">
        <div className="h-7 w-48 bg-gray-200 rounded-lg mb-2" />
        <div className="h-4 w-72 bg-gray-100 rounded mb-10" />
        <div className="h-32 bg-gray-100 rounded-xl" />
      </div>
    );
  }

  return (
    <div>
      <div className="px-8 py-6 pt-8 space-y-4">
        {rejectionReason && (
          <div className="flex items-start gap-3 rounded-xl border border-red-200 bg-red-50 px-5 py-4">
            <AlertCircle className="w-5 h-5 text-red-500 shrink-0 mt-0.5" />
            <div>
              <p className="text-sm font-semibold text-red-800 mb-1">Your previous submission was rejected</p>
              <p className="text-sm text-red-700">{rejectionReason}</p>
              <p className="text-xs text-red-500 mt-2">Please fix the issue above and resubmit all documents below.</p>
            </div>
          </div>
        )}

        {previousDocs && (
          <div className="rounded-xl border border-amber-200 bg-amber-50 px-5 py-4">
            <p className="text-xs font-semibold text-amber-800 uppercase tracking-wider mb-3">
              Previously submitted documents
            </p>
            <div className="flex flex-wrap gap-4">
              {previousDocs.panDocumentUrl && (
                <DocThumb url={previousDocs.panDocumentUrl} label="PAN card" />
              )}
              {previousDocs.documentUrl && (
                <DocThumb
                  url={previousDocs.documentUrl}
                  label={previousDocs.documentType === "aadhaar" ? "Aadhaar front" : "Passport"}
                />
              )}
              {previousDocs.documentBackUrl && (
                <DocThumb url={previousDocs.documentBackUrl} label="Aadhaar back" />
              )}
              {previousDocs.selfieUrl && (
                <DocThumb url={previousDocs.selfieUrl} label="Selfie" />
              )}
            </div>
            <p className="text-[11px] text-amber-600 mt-3">Click any image to view full size.</p>
          </div>
        )}
      </div>

      <KycForm isResubmission />
    </div>
  );
}
