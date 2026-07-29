"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Label } from "@/components/ui/label";
import { PageHeader } from "@/components/common/page-header";
import { UploadZone } from "@/components/common/upload-zone";
import { toast } from "sonner";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { CheckCircle2 } from "lucide-react";

const DOCUMENT_TYPES = [
  { value: "aadhaar",  label: "Aadhaar Card" },
  { value: "passport", label: "Passport" },
] as const;

type DocumentType = (typeof DOCUMENT_TYPES)[number]["value"];

const DOC_META: Record<DocumentType, { placeholder: string; hint: string; back: boolean }> = {
  aadhaar:  { placeholder: "1234 5678 9012", hint: "12-digit Aadhaar number", back: true },
  passport: { placeholder: "A1234567",       hint: "Passport number (letter + 7 digits)", back: false },
};

function StepBadge({ n, done }: { n: number; done: boolean }) {
  return (
    <div className={cn(
      "w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold shrink-0",
      done ? "bg-green-500 text-white" : "bg-[var(--brand-client)] text-white"
    )}>
      {done ? <CheckCircle2 className="w-3.5 h-3.5" /> : n}
    </div>
  );
}

export function KycForm({ isResubmission = false }: { isResubmission?: boolean }) {
  const router = useRouter();

  // Step 1 â€” PAN
  const [panNumber, setPanNumber]       = useState("");
  const [panDocKey, setPanDocKey]       = useState("");

  // Step 2 â€” Identity document
  const [documentType, setDocumentType] = useState<DocumentType>("aadhaar");
  const [documentNumber, setDocumentNumber] = useState("");
  const [documentKey, setDocumentKey]   = useState("");
  const [documentBackKey, setDocumentBackKey] = useState("");

  // Step 3 â€” Selfie
  const [selfieKey, setSelfieKey]       = useState("");

  const [submitting, setSubmitting]     = useState(false);

  const needsBack = documentType === "aadhaar";

  const panValid =
    panNumber.length === 10 &&
    /^[A-Z]{5}[0-9]{4}[A-Z]$/.test(panNumber) &&
    !!panDocKey;

  const docNumValid = documentType === "aadhaar"
    ? /^\d{12}$/.test(documentNumber.replace(/\s/g, ""))
    : /^[A-Z]\d{7}$/.test(documentNumber);

  const idValid =
    docNumValid &&
    !!documentKey &&
    (!needsBack || !!documentBackKey);

  const selfieValid = !!selfieKey;

  const canSubmit = panValid && idValid && selfieValid;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!panValid)    { toast.error("Please complete the PAN card section."); return; }
    if (!idValid)     { toast.error("Please complete the identity document section."); return; }
    if (!selfieValid) { toast.error("Please upload your selfie with document."); return; }

    setSubmitting(true);
    try {
      const res = await fetch("/api/kyc", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          documentType,
          documentNumber: documentNumber.trim(),
          documentUrl: documentKey,
          documentBackUrl: documentBackKey || undefined,
          panNumber,
          panDocumentUrl: panDocKey,
          selfieUrl: selfieKey,
        }),
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        toast.error(err.error ?? "Submission failed. Please try again.");
        return;
      }

      toast.success("KYC submitted successfully!");
      router.push("/editor/kyc/pending");
      router.refresh();
    } catch {
      toast.error("Something went wrong. Please try again.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="px-8 py-6 ">
      <PageHeader
        title={isResubmission ? "Resubmit KYC" : "Identity Verification"}
        subtitle={isResubmission
          ? "Upload your corrected documents. Your previous application will be replaced."
          : "Complete all three steps to activate your profile and start receiving orders."}
      />

      <form onSubmit={handleSubmit} className="mt-8 space-y-10">

        {/* â”€â”€ Step 1: PAN Card â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */}
        <div className="space-y-4">
          <div className="flex items-center gap-2.5">
            <StepBadge n={1} done={panValid} />
            <h2 className="text-base font-semibold text-gray-900">PAN Card <span className="text-destructive">*</span></h2>
          </div>
          <p className="text-sm text-muted-foreground ml-8.5">
            Required for TDS deduction and tax compliance. Your PAN is never shown publicly.
          </p>

          <div className="ml-8 space-y-4">
            <div className="space-y-2">
              <Label>PAN number</Label>
              <input
                type="text"
                value={panNumber}
                onChange={(e) => setPanNumber(e.target.value.toUpperCase().slice(0, 10))}
                placeholder="ABCDE1234F"
                maxLength={10}
                className="w-full px-3.5 py-2.5 rounded-xl border border-gray-200 text-sm font-mono tracking-widest focus:outline-none focus:ring-2 focus:ring-[var(--brand-client)]/20 focus:border-[var(--brand-client)]/50 bg-white"
              />
              {panNumber.length > 0 && panNumber.length < 10 && (
                <p className="text-xs text-amber-600">{10 - panNumber.length} character{10 - panNumber.length !== 1 ? "s" : ""} remaining</p>
              )}
              {panNumber.length === 10 && !/^[A-Z]{5}[0-9]{4}[A-Z]$/.test(panNumber) && (
                <p className="text-xs text-red-500">Invalid PAN format. Should be like ABCDE1234F</p>
              )}
            </div>

            <div className="space-y-2">
              <Label>Upload PAN card image</Label>
              <ul className="text-xs text-gray-500 list-disc ml-4 space-y-0.5 mb-2">
                <li>All four corners must be visible</li>
                <li>Name and PAN number must be clearly readable</li>
                <li>No glare, shadows, or cropping</li>
              </ul>
              <UploadZone
                uploadType="kyc"
                accept="image/*,.pdf"
                onUploaded={({ key }) => setPanDocKey(key)}
                onCleared={() => setPanDocKey("")}
                label="Drop PAN card here or click to browse"
                maxSizeMb={10}
              />
              {panDocKey && <p className="text-sm text-green-600 font-medium">âœ“ PAN card uploaded</p>}
            </div>
          </div>
        </div>

        <div className="border-t border-gray-100" />

        {/* â”€â”€ Step 2: Identity Document â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */}
        <div className="space-y-4">
          <div className="flex items-center gap-2.5">
            <StepBadge n={2} done={idValid} />
            <h2 className="text-base font-semibold text-gray-900">Identity Document <span className="text-destructive">*</span></h2>
          </div>
          <p className="text-sm text-muted-foreground ml-8.5">
            Choose Aadhaar or Passport as your identity proof.
          </p>

          <div className="ml-8 space-y-4">
            {/* Document type picker */}
            <div className="grid grid-cols-2 gap-3">
              {DOCUMENT_TYPES.map(({ value, label }) => (
                <button
                  key={value}
                  type="button"
                  onClick={() => { setDocumentType(value); setDocumentBackKey(""); setDocumentKey(""); setDocumentNumber(""); }}
                  className={cn(
                    "rounded-xl border px-4 py-3 text-sm font-medium text-center transition-colors",
                    documentType === value
                      ? "border-[var(--brand-client)] bg-[var(--brand-client)]/5 text-[var(--brand-client)]"
                      : "border-border hover:border-[var(--brand-client)]/40 text-gray-600"
                  )}
                >
                  {label}
                </button>
              ))}
            </div>

            {/* Document number */}
            <div className="space-y-1">
              <Label>{DOCUMENT_TYPES.find(d => d.value === documentType)?.label} number</Label>
              <p className="text-xs text-muted-foreground">{DOC_META[documentType].hint}</p>
              <input
                type="text"
                value={documentNumber}
                onChange={(e) => setDocumentNumber(e.target.value.toUpperCase())}
                placeholder={DOC_META[documentType].placeholder}
                maxLength={30}
                className="w-full px-3.5 py-2.5 rounded-xl border border-gray-200 text-sm font-mono tracking-wider focus:outline-none focus:ring-2 focus:ring-[var(--brand-client)]/20 focus:border-[var(--brand-client)]/50 bg-white"
              />
              {documentNumber.length > 0 && (() => {
                const digits = documentNumber.replace(/\s/g, "");
                if (documentType === "aadhaar" && !/^\d{12}$/.test(digits)) {
                  return <p className="text-xs text-red-500">Aadhaar must be exactly 12 digits (no letters or spaces)</p>;
                }
                if (documentType === "passport" && documentNumber.length >= 8 && !/^[A-Z]\d{7}$/.test(documentNumber)) {
                  return <p className="text-xs text-red-500">Passport must be a letter followed by 7 digits (e.g. A1234567)</p>;
                }
                return null;
              })()}
            </div>

            {/* Front */}
            <div className="space-y-2">
              <Label>
                {documentType === "aadhaar" ? "Front side" : "Document photo/scan"}
              </Label>
              <ul className="text-xs text-gray-500 list-disc ml-4 space-y-0.5">
                {documentType === "aadhaar" ? (
                  <>
                    <li>Front side showing your name, photo, and 12-digit number</li>
                    <li>All four corners visible, no blurring</li>
                  </>
                ) : (
                  <>
                    <li>Bio-data page showing photo, name, DOB, and passport number</li>
                    <li>Entire page visible, no reflections</li>
                  </>
                )}
              </ul>
              <UploadZone
                uploadType="kyc"
                accept="image/*,.pdf"
                onUploaded={({ key }) => setDocumentKey(key)}
                onCleared={() => setDocumentKey("")}
                label="Drop front here or click to browse"
                maxSizeMb={10}
              />
              {documentKey && <p className="text-sm text-green-600 font-medium">âœ“ Front uploaded</p>}
            </div>

            {/* Back â€” Aadhaar only */}
            {needsBack && (
              <div className="space-y-2">
                <Label>Back side <span className="text-destructive">*</span></Label>
                <p className="text-xs text-muted-foreground">Back showing your address and barcode.</p>
                <UploadZone
                  uploadType="kyc"
                  accept="image/*,.pdf"
                  onUploaded={({ key }) => setDocumentBackKey(key)}
                  onCleared={() => setDocumentBackKey("")}
                  label="Drop back here or click to browse"
                  maxSizeMb={10}
                />
                {documentBackKey && <p className="text-sm text-green-600 font-medium">âœ“ Back uploaded</p>}
              </div>
            )}
          </div>
        </div>

        <div className="border-t border-gray-100" />

        {/* â”€â”€ Step 3: Selfie â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */}
        <div className="space-y-4">
          <div className="flex items-center gap-2.5">
            <StepBadge n={3} done={selfieValid} />
            <h2 className="text-base font-semibold text-gray-900">Selfie with Document <span className="text-destructive">*</span></h2>
          </div>
          <p className="text-sm text-muted-foreground ml-8.5">
            Hold your identity document next to your face. This confirms you are the document owner and speeds up verification.
          </p>

          <div className="ml-8 space-y-2">
            <ul className="text-xs text-gray-500 list-disc ml-4 space-y-0.5">
              <li>Hold the document next to your face â€” both must be in the same photo</li>
              <li>Your face must be clearly visible and unobstructed</li>
              <li>Good lighting â€” no dark or backlit photos</li>
              <li>No screenshots or printouts of photos</li>
            </ul>
            <UploadZone
              uploadType="kyc"
              accept="image/*"
              onUploaded={({ key }) => setSelfieKey(key)}
              onCleared={() => setSelfieKey("")}
              label="Drop selfie here or click to browse"
              maxSizeMb={10}
            />
            {selfieKey && <p className="text-sm text-green-600 font-medium mt-2">âœ“ Selfie uploaded</p>}
          </div>
        </div>

        {/* Tips */}
        <div className="rounded-xl bg-amber-50 border border-amber-200 p-4 text-sm text-amber-800">
          <p className="font-semibold mb-1.5">Before you submit</p>
          <ul className="list-disc ml-4 space-y-1 text-xs">
            <li>All four corners of every document must be clearly visible.</li>
            <li>Names and ID numbers must be readable â€” no blurry or cropped images.</li>
            <li>Your PAN number is stored securely and used only for TDS compliance.</li>
            <li>Your application will be reviewed within 1â€“2 business days.</li>
          </ul>
        </div>

        {/* Progress indicator */}
        <div className="flex items-center gap-2 text-xs text-gray-500">
          <span className={cn("font-medium", panValid ? "text-green-600" : "text-gray-400")}>
            {panValid ? "âœ“" : "â—‹"} PAN
          </span>
          <span className="text-gray-300">Â·</span>
          <span className={cn("font-medium", idValid ? "text-green-600" : "text-gray-400")}>
            {idValid ? "âœ“" : "â—‹"} Identity
          </span>
          <span className="text-gray-300">Â·</span>
          <span className={cn("font-medium", selfieValid ? "text-green-600" : "text-gray-400")}>
            {selfieValid ? "âœ“" : "â—‹"} Selfie
          </span>
        </div>

        <button
          type="submit"
          disabled={submitting || !canSubmit}
          className={cn(
            buttonVariants({ size: "lg" }),
            "w-full bg-[var(--brand-client)] hover:bg-[var(--brand-client-hover)]",
            (!canSubmit || submitting) && "opacity-50 cursor-not-allowed"
          )}
        >
          {submitting ? "Submittingâ€¦" : "Submit KYC"}
        </button>
      </form>
    </div>
  );
}
