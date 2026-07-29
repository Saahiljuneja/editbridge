import { notFound, redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { kycApplications, editors, users } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { formatDateTime, formatDate, maskPan, maskAadhaar } from "@/lib/utils";
import { PageHeader } from "@/components/common/page-header";
import { getPresignedDownloadUrl } from "@/lib/r2";
import { desc } from "drizzle-orm";
import { KycReviewForm } from "./kyc-review-form";
import { ExpireButton } from "./expire-button";
import Link from "next/link";
import type { UserRole } from "@/types";

const ALLOWED: UserRole[] = ["admin", "staff_kyc"];

export default async function AdminKycDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const session = await auth();
  if (!session || !ALLOWED.includes(session.user.role as UserRole)) redirect("/admin/dashboard");

  const { id } = await params;

  const [row] = await db
    .select({
      id: kycApplications.id,
      editorId: kycApplications.editorId,
      documentType: kycApplications.documentType,
      documentNumber: kycApplications.documentNumber,
      documentUrl: kycApplications.documentUrl,
      documentBackUrl: kycApplications.documentBackUrl,
      panDocumentUrl: kycApplications.panDocumentUrl,
      selfieUrl: kycApplications.selfieUrl,
      status: kycApplications.status,
      rejectionReason: kycApplications.rejectionReason,
      adminNotes: kycApplications.adminNotes,
      submissionNumber: kycApplications.submissionNumber,
      createdAt: kycApplications.createdAt,
      userName: users.name,
      userEmail: users.email,
      panNumber: editors.panNumber,
      kycRejectionCount: editors.kycRejectionCount,
    })
    .from(kycApplications)
    .innerJoin(editors, eq(editors.id, kycApplications.editorId))
    .innerJoin(users, eq(users.id, editors.userId))
    .where(eq(kycApplications.id, id))
    .limit(1);

  if (!row) notFound();

  // Generate presigned download URLs (1 hour) for all KYC documents
  const EXPIRY = 3600;
  const [panDocSignedUrl, docFrontSignedUrl, docBackSignedUrl, selfieSignedUrl] = await Promise.all([
    row.panDocumentUrl ? getPresignedDownloadUrl(row.panDocumentUrl, EXPIRY) : Promise.resolve(null),
    row.documentUrl    ? getPresignedDownloadUrl(row.documentUrl, EXPIRY)    : Promise.resolve(null),
    row.documentBackUrl ? getPresignedDownloadUrl(row.documentBackUrl, EXPIRY) : Promise.resolve(null),
    row.selfieUrl      ? getPresignedDownloadUrl(row.selfieUrl, EXPIRY)      : Promise.resolve(null),
  ]);

  // Fetch all other submissions by this editor for the history panel
  const history = await db
    .select({
      id: kycApplications.id,
      submissionNumber: kycApplications.submissionNumber,
      status: kycApplications.status,
      documentType: kycApplications.documentType,
      rejectionReason: kycApplications.rejectionReason,
      adminNotes: kycApplications.adminNotes,
      createdAt: kycApplications.createdAt,
    })
    .from(kycApplications)
    .where(eq(kycApplications.editorId, row.editorId))
    .orderBy(desc(kycApplications.createdAt));

  return (
    <div className="max-w-2xl mx-auto px-4 py-10">
      <div className="mb-4">
        <Link href="/admin/kyc" className="text-sm text-muted-foreground hover:text-foreground">
          ← KYC Queue
        </Link>
      </div>

      <PageHeader
        title={`KYC Review — Submission #${row.submissionNumber}`}
        subtitle={`${row.userName ?? row.userEmail} · submitted ${formatDateTime(row.createdAt)}`}
      />
      {row.kycRejectionCount >= 2 && (
        <div className="mt-3 flex items-center gap-2 rounded-lg bg-red-50 border border-red-200 px-4 py-2.5 text-sm text-red-700">
          <span className="font-semibold">⚠ {row.kycRejectionCount} rejection{row.kycRejectionCount !== 1 ? "s" : ""} on record.</span>
          {row.kycRejectionCount >= 3
            ? " This editor is now blocked from resubmitting."
            : " One more rejection will block further submissions."}
        </div>
      )}

      <div className="mt-6 space-y-5">
        <div className="rounded-xl border border-border bg-white p-5 space-y-5">
          {/* Editor info */}
          <div className="grid grid-cols-2 gap-4 pb-4 border-b border-gray-100">
            <div>
              <p className="text-xs text-muted-foreground uppercase tracking-wider mb-1">Editor</p>
              <p className="font-medium">{row.userName}</p>
              <p className="text-sm text-muted-foreground">{row.userEmail}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground uppercase tracking-wider mb-1">Document type</p>
              <p className="capitalize font-medium">{row.documentType}</p>
              {row.documentNumber && (
                <p className="text-sm text-muted-foreground font-mono mt-0.5">
                  {row.documentType === "aadhaar" ? maskAadhaar(row.documentNumber) : row.documentNumber}
                </p>
              )}
            </div>
          </div>

          {/* PAN card */}
          <div className="pb-4 border-b border-gray-100">
            <div className="flex items-center justify-between mb-2">
              <p className="text-xs text-muted-foreground uppercase tracking-wider">PAN Card</p>
              {row.panNumber && (
                <span className="font-mono text-sm font-semibold tracking-widest text-gray-900">
                  {maskPan(row.panNumber)}
                </span>
              )}
            </div>
            {panDocSignedUrl ? (
              <>
                <a href={panDocSignedUrl} target="_blank" rel="noopener noreferrer" className="block">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={panDocSignedUrl} alt="PAN card"
                    className="rounded-lg border border-border max-h-48 w-full object-contain bg-gray-50 hover:opacity-90 transition-opacity cursor-zoom-in" />
                </a>
                <a href={panDocSignedUrl} target="_blank" rel="noopener noreferrer"
                  className="text-xs text-muted-foreground hover:text-foreground mt-1 inline-block">Open full size ↗</a>
              </>
            ) : (
              <p className="text-sm text-red-500">No PAN document uploaded</p>
            )}
          </div>

          {/* Identity document front */}
          <div className={row.documentBackUrl ? "pb-4 border-b border-gray-100" : ""}>
            <p className="text-xs text-muted-foreground uppercase tracking-wider mb-2">
              {row.documentType === "aadhaar" ? "Aadhaar — Front" : "Identity Document"}
            </p>
            {docFrontSignedUrl && (
              <>
                <a href={docFrontSignedUrl} target="_blank" rel="noopener noreferrer" className="block">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={docFrontSignedUrl} alt="KYC document front"
                    className="rounded-lg border border-border max-h-64 w-full object-contain bg-gray-50 hover:opacity-90 transition-opacity cursor-zoom-in" />
                </a>
                <a href={docFrontSignedUrl} target="_blank" rel="noopener noreferrer"
                  className="text-xs text-muted-foreground hover:text-foreground mt-1 inline-block">Open full size ↗</a>
              </>
            )}
          </div>

          {/* Aadhaar back */}
          {docBackSignedUrl && (
            <div className="pb-4 border-b border-gray-100">
              <p className="text-xs text-muted-foreground uppercase tracking-wider mb-2">Aadhaar — Back</p>
              <a href={docBackSignedUrl} target="_blank" rel="noopener noreferrer" className="block">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={docBackSignedUrl} alt="Aadhaar back"
                  className="rounded-lg border border-border max-h-48 w-full object-contain bg-gray-50 hover:opacity-90 transition-opacity cursor-zoom-in" />
              </a>
              <a href={docBackSignedUrl} target="_blank" rel="noopener noreferrer"
                className="text-xs text-muted-foreground hover:text-foreground mt-1 inline-block">Open full size ↗</a>
            </div>
          )}

          {/* Selfie */}
          {selfieSignedUrl && (
            <div>
              <p className="text-xs text-muted-foreground uppercase tracking-wider mb-2">Selfie with Document</p>
              <a href={selfieSignedUrl} target="_blank" rel="noopener noreferrer" className="block">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={selfieSignedUrl} alt="Selfie"
                  className="rounded-lg border border-border max-h-48 w-full object-contain bg-gray-50 hover:opacity-90 transition-opacity cursor-zoom-in" />
              </a>
              <a href={selfieSignedUrl} target="_blank" rel="noopener noreferrer"
                className="text-xs text-muted-foreground hover:text-foreground mt-1 inline-block">Open full size ↗</a>
            </div>
          )}
        </div>

        {row.status === "pending" ? (
          <KycReviewForm applicationId={id} editorId={row.editorId} />
        ) : (
          <div className={`rounded-xl border px-5 py-4 ${row.status === "approved" ? "border-green-200 bg-green-50" : "border-red-200 bg-red-50"}`}>
            {row.status === "approved" && (
              <div className="flex items-center justify-between mb-3 pb-3 border-b border-green-100">
                <span className="text-xs text-green-600">Force re-verification if documents are outdated or suspicious.</span>
                <ExpireButton applicationId={id} />
              </div>
            )}
            <p className={`font-semibold text-sm ${row.status === "approved" ? "text-green-800" : "text-red-800"}`}>
              {row.status === "approved" ? "Approved" : "Rejected"}
            </p>
            {row.rejectionReason && (
              <p className="text-sm text-red-700 mt-1">{row.rejectionReason}</p>
            )}
            {row.adminNotes && (
              <div className="mt-3 pt-3 border-t border-current/10">
                <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1">Internal notes</p>
                <p className="text-sm text-gray-700">{row.adminNotes}</p>
              </div>
            )}
          </div>
        )}

        {/* Submission history */}
        {history.length > 1 && (
          <div className="rounded-xl border border-border bg-white p-5">
            <p className="font-semibold text-sm mb-3">Submission history ({history.length} total)</p>
            <div className="space-y-2">
              {history.map((h) => (
                <div
                  key={h.id}
                  className={`flex items-start gap-3 rounded-lg px-3 py-2.5 ${h.id === id ? "bg-blue-50 border border-blue-100" : "bg-gray-50"}`}
                >
                  <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${
                    h.status === "approved" ? "bg-green-100 text-green-700" :
                    h.status === "rejected" ? "bg-red-100 text-red-700" :
                    "bg-amber-100 text-amber-700"
                  }`}>#{h.submissionNumber}</span>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs text-gray-500">{formatDate(h.createdAt)} · <span className="capitalize">{h.documentType}</span></p>
                    {h.rejectionReason && (
                      <p className="text-xs text-red-600 mt-0.5 truncate">{h.rejectionReason}</p>
                    )}
                    {h.adminNotes && (
                      <p className="text-xs text-gray-400 mt-0.5 truncate">Notes: {h.adminNotes}</p>
                    )}
                  </div>
                  {h.id !== id && (
                    <Link href={`/admin/kyc/${h.id}`} className="text-xs text-[var(--brand-client)] hover:underline shrink-0">
                      View →
                    </Link>
                  )}
                  {h.id === id && <span className="text-xs text-blue-500 font-medium shrink-0">Current</span>}
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
