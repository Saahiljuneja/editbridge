import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { kycApplications } from "@/lib/db/schema";
import { eq, desc } from "drizzle-orm";
import Link from "next/link";
import { buttonVariants } from "@/components/ui/button";
import { Clock, Mail, CheckCircle, XCircle, AlertTriangle, RefreshCw } from "lucide-react";

export default async function KycPendingPage() {
  const session = await auth();
  if (!session || session.user?.role !== "editor") redirect("/login");

  const editorId = session.user.editorId;
  if (!editorId) redirect("/editor/dashboard");

  const [application] = await db
    .select({
      status: kycApplications.status,
      rejectionReason: kycApplications.rejectionReason,
      submissionNumber: kycApplications.submissionNumber,
      createdAt: kycApplications.createdAt,
    })
    .from(kycApplications)
    .where(eq(kycApplications.editorId, editorId))
    .orderBy(desc(kycApplications.createdAt))
    .limit(1);

  if (!application) redirect("/editor/kyc");
  if (application.status === "approved") redirect("/editor/dashboard");

  const isRejected = application.status === "rejected";

  return (
    <div className="px-6 py-10 text-center max-w-xl mx-auto">
      <div className={`w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-6 ${isRejected ? "bg-red-100" : "bg-amber-100"}`}>
        {isRejected
          ? <XCircle className="w-10 h-10 text-red-500" />
          : <Clock className="w-10 h-10 text-amber-500" />
        }
      </div>

      <h1 className="text-2xl font-bold mb-2">
        {isRejected ? "Application rejected" : "Application under review"}
      </h1>
      {!isRejected && (
        <p className="text-xs font-mono text-gray-400 mb-3">
          Submission #{application.submissionNumber}
        </p>
      )}
      <p className="text-muted-foreground mb-8 px-4">
        {isRejected
          ? "Your KYC application was not approved. Please review the reason below and resubmit with the correct documents."
          : "Your KYC application has been submitted. Our team will review it within 1–2 business days and send you an email with the decision."
        }
      </p>

      {isRejected && application.rejectionReason && (
        <div className="bg-red-50 border border-red-200 rounded-xl p-5 mb-8 text-left">
          <div className="flex items-start gap-3">
            <AlertTriangle className="w-5 h-5 text-red-500 shrink-0 mt-0.5" />
            <div>
              <p className="text-sm font-semibold text-red-800 mb-1">Reason for rejection</p>
              <p className="text-sm text-red-700">{application.rejectionReason}</p>
            </div>
          </div>
        </div>
      )}

      {!isRejected && (
        <div className="bg-muted/50 rounded-xl p-6 mb-8 text-left space-y-4">
          <h2 className="font-semibold text-sm uppercase tracking-wide text-muted-foreground mb-3">What happens next</h2>
          <div className="flex items-start gap-3">
            <CheckCircle className="w-5 h-5 text-green-500 shrink-0 mt-0.5" />
            <p className="text-sm">Your documents are reviewed by our KYC team.</p>
          </div>
          <div className="flex items-start gap-3">
            <Mail className="w-5 h-5 text-[var(--brand-client)] shrink-0 mt-0.5" />
            <p className="text-sm">
              You will receive an email once your application is approved or if additional information is required.
            </p>
          </div>
          <div className="flex items-start gap-3">
            <CheckCircle className="w-5 h-5 text-[var(--brand-client)] shrink-0 mt-0.5" />
            <p className="text-sm">
              Once approved, your profile will go live and you can start building your packages.
            </p>
          </div>
        </div>
      )}

      <p className="text-sm text-muted-foreground mb-6">
        Questions? Email us at{" "}
        <a href="mailto:support@editbridge.in" className="text-[var(--brand-client)] underline">
          support@editbridge.in
        </a>
      </p>

      <div className="flex flex-col sm:flex-row gap-3 justify-center">
        {isRejected && (
          <Link
            href="/editor/kyc/resubmit"
            className={buttonVariants({ variant: "default" })}
          >
            <RefreshCw className="w-4 h-4 mr-2" /> Resubmit application
          </Link>
        )}
        <Link href="/editor/dashboard" className={buttonVariants({ variant: "outline" })}>
          Return to dashboard
        </Link>
      </div>
    </div>
  );
}