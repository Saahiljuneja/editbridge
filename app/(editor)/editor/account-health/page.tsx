export const dynamic = "force-dynamic";

import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { editors } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { calculateEditorHealth, scoreToStatus, WEIGHTS } from "@/lib/health";
import type { HealthStatus, ImprovementAction } from "@/lib/health";
import Link from "next/link";
import {
  ArrowLeft, ShieldAlert, ShieldCheck, AlertTriangle,
  CheckCircle2, XCircle, Info, ArrowRight, Clock,
  Star, TrendingUp, Users, BadgeCheck, Activity,
} from "lucide-react";
import { cn } from "@/lib/utils";

// ── Presentation helpers ─────────────────────────────────────────────────────

const STATUS_CONFIG: Record<HealthStatus, {
  label: string;
  color: string;
  bgCard: string;
  border: string;
  barColor: string;
  icon: React.ElementType;
}> = {
  excellent:       { label: "Excellent",       color: "text-emerald-700", bgCard: "bg-emerald-50",  border: "border-emerald-200", barColor: "bg-emerald-500",  icon: ShieldCheck },
  good:            { label: "Good",            color: "text-emerald-700", bgCard: "bg-emerald-50",  border: "border-emerald-200", barColor: "bg-emerald-500",  icon: ShieldCheck },
  needs_attention: { label: "Needs Attention", color: "text-amber-700",   bgCard: "bg-amber-50",    border: "border-amber-200",   barColor: "bg-amber-500",    icon: AlertTriangle },
  at_risk:         { label: "At Risk",         color: "text-orange-700",  bgCard: "bg-orange-50",   border: "border-orange-200",  barColor: "bg-orange-500",   icon: AlertTriangle },
  critical:        { label: "Critical",        color: "text-red-700",     bgCard: "bg-red-50",      border: "border-red-200",     barColor: "bg-red-500",      icon: ShieldAlert },
};

const CATEGORY_CONFIG = [
  { key: "orderReliability" as const, label: "Order Reliability",  weight: WEIGHTS.orderReliability,  icon: TrendingUp,   description: "Acceptance rate, on-time delivery, cancellation rate" },
  { key: "quality"          as const, label: "Quality",            weight: WEIGHTS.quality,            icon: Star,         description: "Client ratings, revision frequency, dispute rate" },
  { key: "clientExperience" as const, label: "Client Experience",  weight: WEIGHTS.clientExperience,   icon: Users,        description: "Response time, repeat client rate, open disputes" },
  { key: "compliance"       as const, label: "Compliance",         weight: WEIGHTS.compliance,         icon: BadgeCheck,   description: "KYC status, bank account, active packages, PAN" },
  { key: "activity"         as const, label: "Activity",           weight: WEIGHTS.activity,           icon: Activity,     description: "Recent completed orders, availability status" },
];

function ScoreBar({ score, colorClass }: { score: number; colorClass: string }) {
  return (
    <div className="w-full h-2 rounded-full bg-gray-100 overflow-hidden">
      <div
        className={cn("h-full rounded-full transition-all", colorClass)}
        style={{ width: `${score}%` }}
      />
    </div>
  );
}

function SignalRow({ label, value, good }: { label: string; value: string; good: boolean }) {
  return (
    <div className="flex items-center justify-between py-1.5">
      <div className="flex items-center gap-2 text-xs text-gray-600 font-medium">
        {good
          ? <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
          : <XCircle className="w-3.5 h-3.5 text-amber-500 shrink-0" />
        }
        {label}
      </div>
      <span className={cn("text-xs font-bold tabular-nums", good ? "text-gray-700" : "text-amber-700")}>{value}</span>
    </div>
  );
}

export default async function AccountHealthPage() {
  const session = await auth();
  if (!session || session.user?.role !== "editor") redirect("/login");

  const editorId = session.user.editorId;
  if (!editorId) redirect("/editor/kyc");

  // Check suspension state first (fast path)
  const [editorRow] = await db
    .select({ isSuspended: editors.isSuspended, suspensionReason: editors.suspensionReason })
    .from(editors)
    .where(eq(editors.id, editorId))
    .limit(1);

  // Full health calculation (fresh on every page load)
  const health = await calculateEditorHealth(editorId);

  const priorityMap = { high: "🔴", medium: "🟡", low: "⚪" };

  const headerNav = (
    <div className="bg-white border-b border-gray-100">
      <div className="max-w-3xl mx-auto px-6 py-4 flex items-center gap-3">
        <Link href="/editor/dashboard" className="w-8 h-8 rounded-lg border border-gray-200 flex items-center justify-center text-gray-500 hover:bg-gray-50">
          <ArrowLeft className="w-4 h-4" />
        </Link>
        <div>
          <h1 className="text-base font-bold text-gray-900">Account Health</h1>
          <p className="text-xs text-gray-400">Your account status and eligibility</p>
        </div>
      </div>
    </div>
  );

  if (editorRow?.isSuspended) {
    return (
      <div className="min-h-screen bg-gray-50">
        <div className="bg-white border-b border-gray-100">
          <div className="max-w-3xl mx-auto px-6 py-4 flex items-center gap-3">
            <Link href="/editor/dashboard" className="w-8 h-8 rounded-lg border border-gray-200 flex items-center justify-center text-gray-500 hover:bg-gray-50">
              <ArrowLeft className="w-4 h-4" />
            </Link>
            <div>
              <h1 className="text-base font-bold text-gray-900">Account Health</h1>
              <p className="text-xs text-gray-400">Your account status and eligibility</p>
            </div>
          </div>
        </div>
        <div className="max-w-3xl mx-auto px-6 py-12">
          <div className="bg-red-50 border border-red-200 rounded-2xl p-8 text-center space-y-4">
            <div className="w-16 h-16 rounded-2xl bg-red-100 border border-red-200 flex items-center justify-center mx-auto">
              <ShieldAlert className="w-8 h-8 text-red-600" />
            </div>
            <div>
              <p className="text-lg font-bold text-red-900">Account Suspended</p>
              <p className="text-sm text-red-700 mt-2 max-w-md mx-auto">
                {editorRow.suspensionReason ?? "Your account has been suspended by our team."}
              </p>
            </div>
            <p className="text-xs text-red-600">
              You cannot receive or accept new orders while suspended. Existing orders are unaffected.
              Contact <a href="mailto:support@editbridge.in" className="underline font-semibold">support@editbridge.in</a> to resolve this.
            </p>
          </div>
        </div>
      </div>
    );
  }

  if (health.notEnoughData) {
    return (
      <div className="min-h-screen bg-gray-50">
        {headerNav}
        <div className="max-w-3xl mx-auto px-6 py-12">
          <div className="bg-white border border-border rounded-2xl p-8 text-center space-y-4">
            <div className="w-16 h-16 rounded-2xl bg-[#0EA5E9]/10 flex items-center justify-center mx-auto">
              <Clock className="w-8 h-8 text-[#0EA5E9]" />
            </div>
            <div>
              <p className="text-lg font-bold text-gray-900">Not enough data yet</p>
              <p className="text-sm text-gray-500 mt-2 max-w-md mx-auto">
                Your Account Health score is calculated after you receive at least 5 orders.
                You have {health.signals.totalOrdersReceived} so far — keep completing orders to unlock your score.
              </p>
            </div>
            <Link
              href="/editor/orders"
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold text-white bg-[#0EA5E9] hover:bg-sky-600 transition-colors"
            >
              View your orders <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
        </div>
      </div>
    );
  }

  const cfg    = STATUS_CONFIG[health.healthStatus];
  const StatusIcon = cfg.icon;

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-100">
        <div className="max-w-3xl mx-auto px-6 py-4 flex items-center gap-3">
          <Link href="/editor/dashboard" className="w-8 h-8 rounded-lg border border-gray-200 flex items-center justify-center text-gray-500 hover:bg-gray-50 transition-colors shrink-0">
            <ArrowLeft className="w-4 h-4" />
          </Link>
          <div className="flex-1 min-w-0">
            <h1 className="text-base font-bold text-gray-900">Account Health</h1>
            <p className="text-xs text-gray-400">
              Last updated {health.computedAt.toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" })}
            </p>
          </div>
        </div>
      </div>

      <div className="max-w-3xl mx-auto px-6 py-6 space-y-5">
        {/* ── Overall score card ─────────────────────────────────────── */}
        <div className={cn("rounded-2xl border p-6 space-y-5", cfg.bgCard, cfg.border)}>
          <div className="flex items-center justify-between flex-wrap gap-4">
            {/* Score circle */}
            <div className="flex items-center gap-5">
              <div className="relative w-24 h-24 shrink-0">
                <svg className="w-full h-full -rotate-90" viewBox="0 0 80 80">
                  <circle cx="40" cy="40" r="34" fill="none" stroke="currentColor" strokeWidth="8" className="text-white/60" />
                  <circle
                    cx="40" cy="40" r="34"
                    fill="none" strokeWidth="8"
                    stroke="currentColor"
                    className={cfg.color}
                    strokeLinecap="round"
                    strokeDasharray={`${2 * Math.PI * 34}`}
                    strokeDashoffset={`${2 * Math.PI * 34 * (1 - health.totalScore / 100)}`}
                  />
                </svg>
                <div className="absolute inset-0 flex flex-col items-center justify-center">
                  <span className={cn("text-2xl font-black tabular-nums", cfg.color)}>{health.totalScore}</span>
                  <span className={cn("text-[9px] font-bold uppercase tracking-wider", cfg.color)}>/ 100</span>
                </div>
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <StatusIcon className={cn("w-5 h-5", cfg.color)} />
                  <span className={cn("text-xl font-black", cfg.color)}>{cfg.label}</span>
                </div>
                <p className="text-sm text-gray-600 mt-1 max-w-xs">
                  {health.healthStatus === "excellent" && "Your account is fully healthy. Keep it up!"}
                  {health.healthStatus === "good" && "Your account is performing well. Minor improvements available."}
                  {health.healthStatus === "needs_attention" && "Some areas need attention. See recommendations below."}
                  {health.healthStatus === "at_risk" && "Your account has issues that may affect your marketplace standing."}
                  {health.healthStatus === "critical" && "New order acceptance is paused until your health improves."}
                </p>
              </div>
            </div>

            {/* Status chip */}
            {health.healthStatus === "critical" && (
              <div className="rounded-xl border border-red-200 bg-red-100 px-4 py-2.5 text-xs text-red-800 font-bold">
                New orders paused
              </div>
            )}
            {health.healthStatus === "at_risk" && (
              <div className="rounded-xl border border-orange-200 bg-orange-100 px-4 py-2.5 text-xs text-orange-800 font-bold">
                Warning — action needed
              </div>
            )}
          </div>

          {/* Thresholds reference */}
          <div className="grid grid-cols-5 gap-1 text-center">
            {(["90–100 Excellent", "75–89 Good", "60–74 Needs Attention", "40–59 At Risk", "0–39 Critical"] as const).map((t, i) => {
              const colors = ["text-emerald-600", "text-emerald-600", "text-amber-600", "text-orange-600", "text-red-600"];
              return (
                <div key={i} className="text-[9px] font-semibold leading-tight" style={{ color: undefined }}>
                  <span className={colors[i]}>{t.split(" ")[0]}</span>
                  <br />
                  <span className="text-gray-400">{t.split(" ").slice(1).join(" ")}</span>
                </div>
              );
            })}
          </div>
        </div>

        {/* ── Category breakdown ─────────────────────────────────────── */}
        <section className="rounded-2xl border border-gray-100 bg-white shadow-sm overflow-hidden">
          <div className="px-5 py-4 border-b border-gray-50">
            <h2 className="font-semibold text-gray-900 text-sm">Category Breakdown</h2>
          </div>
          <div className="divide-y divide-gray-50">
            {CATEGORY_CONFIG.map(({ key, label, weight, icon: Icon, description }) => {
              const score = health.categoryScores[key];
              const barColor = score >= 75 ? "bg-emerald-500" : score >= 60 ? "bg-amber-500" : score >= 40 ? "bg-orange-500" : "bg-red-500";
              return (
                <div key={key} className="px-5 py-4 space-y-2">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className="w-7 h-7 rounded-lg bg-gray-50 border border-gray-100 flex items-center justify-center shrink-0">
                        <Icon className="w-4 h-4 text-gray-500" />
                      </div>
                      <div>
                        <p className="text-sm font-semibold text-gray-900">{label}</p>
                        <p className="text-[10px] text-gray-400">{description} · weight {Math.round(weight * 100)}%</p>
                      </div>
                    </div>
                    <span className={cn(
                      "text-sm font-black tabular-nums",
                      score >= 75 ? "text-emerald-600" : score >= 60 ? "text-amber-600" : score >= 40 ? "text-orange-600" : "text-red-600"
                    )}>
                      {score}
                    </span>
                  </div>
                  <ScoreBar score={score} colorClass={barColor} />
                </div>
              );
            })}
          </div>
        </section>

        {/* ── Signal detail ──────────────────────────────────────────── */}
        <section className="rounded-2xl border border-gray-100 bg-white shadow-sm overflow-hidden">
          <div className="px-5 py-4 border-b border-gray-50 flex items-center gap-2">
            <Info className="w-4 h-4 text-gray-400" />
            <h2 className="font-semibold text-gray-900 text-sm">Signal Detail</h2>
          </div>
          <div className="px-5 py-4 space-y-1 divide-y divide-gray-50">
            <div className="pb-3 space-y-0.5">
              <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider pb-1">Order Reliability</p>
              <SignalRow label="Acceptance rate" value={`${health.signals.acceptanceRate}%`} good={health.signals.acceptanceRate >= 80} />
              <SignalRow label="No-response rate" value={`${health.signals.noResponseRate}%`} good={health.signals.noResponseRate <= 5} />
              <SignalRow label="On-time delivery" value={`${health.signals.onTimeDeliveryPct}%`} good={health.signals.onTimeDeliveryPct >= 85} />
              <SignalRow label="Editor cancellation rate" value={`${health.signals.editorCancellationRate}%`} good={health.signals.editorCancellationRate <= 5} />
              <p className="text-[10px] text-gray-400 pt-1">{health.signals.totalOrdersReceived} orders received total</p>
            </div>
            <div className="py-3 space-y-0.5">
              <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider pb-1">Quality</p>
              <SignalRow label="Average rating" value={health.signals.avgRating > 0 ? `${health.signals.avgRating.toFixed(1)} ★` : "No reviews yet"} good={health.signals.avgRating >= 4.0 || health.signals.totalCompleted === 0} />
              <SignalRow label="5-star rate" value={`${health.signals.fiveStarPct}%`} good={health.signals.fiveStarPct >= 60} />
              <SignalRow label="Revisions per order" value={health.signals.revisionFrequency.toFixed(2)} good={health.signals.revisionFrequency <= 0.5} />
              <SignalRow label="Dispute rate" value={`${health.signals.disputeRate}%`} good={health.signals.disputeRate <= 5} />
              {health.signals.openDisputeCount > 0 && (
                <SignalRow label="Open disputes" value={String(health.signals.openDisputeCount)} good={false} />
              )}
            </div>
            <div className="py-3 space-y-0.5">
              <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider pb-1">Client Experience</p>
              <SignalRow label="Response time score" value={`${health.signals.responseRateScore}/100`} good={health.signals.responseRateScore >= 75} />
              <SignalRow label="Repeat client rate" value={`${health.signals.repeatClientRate}%`} good={health.signals.repeatClientRate >= 20} />
            </div>
            <div className="py-3 space-y-0.5">
              <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider pb-1">Compliance</p>
              <SignalRow label="KYC status" value={health.signals.kycScore === 100 ? "Approved" : health.signals.kycScore === 60 ? "Pending" : health.signals.kycScore === 40 ? "Expired" : "Rejected"} good={health.signals.kycScore === 100} />
              <SignalRow label="Bank account" value={health.signals.hasBankAccount ? "Added" : "Missing"} good={health.signals.hasBankAccount} />
              <SignalRow label="Active package" value={health.signals.hasActivePackage ? "Yes" : "None"} good={health.signals.hasActivePackage} />
              <SignalRow label="PAN number" value={health.signals.panProvided ? "Added" : "Missing"} good={health.signals.panProvided} />
            </div>
            <div className="pt-3 space-y-0.5">
              <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider pb-1">Activity</p>
              <SignalRow label="Available for orders" value={health.signals.isAvailable ? "Yes" : "Paused"} good={health.signals.isAvailable} />
              <SignalRow label="Active orders" value={String(health.signals.activeOrderCount)} good={health.signals.activeOrderCount > 0} />
              <SignalRow
                label="Days since last completed order"
                value={health.signals.daysSinceLastOrder >= 999 ? "None yet" : `${health.signals.daysSinceLastOrder}d`}
                good={health.signals.daysSinceLastOrder < 30}
              />
            </div>
          </div>
        </section>

        {/* ── Improvement actions ────────────────────────────────────── */}
        {health.improvementActions.length > 0 && (
          <section className="rounded-2xl border border-gray-100 bg-white shadow-sm overflow-hidden">
            <div className="px-5 py-4 border-b border-gray-50">
              <h2 className="font-semibold text-gray-900 text-sm">How to Improve</h2>
              <p className="text-xs text-gray-400 mt-0.5">Actions generated from your actual account signals</p>
            </div>
            <div className="divide-y divide-gray-50">
              {health.improvementActions.map((action, i) => (
                <div key={i} className="px-5 py-4 flex items-start gap-3">
                  <span className="text-sm shrink-0 mt-0.5">{priorityMap[action.priority]}</span>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-gray-900">{action.title}</p>
                    <p className="text-xs text-gray-500 mt-0.5 leading-relaxed">{action.description}</p>
                    {action.href && (
                      <Link
                        href={action.href}
                        className="inline-flex items-center gap-1 mt-2 text-xs font-bold text-[#1e40af] hover:underline"
                      >
                        Take action <ArrowRight className="w-3 h-3" />
                      </Link>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </section>
        )}

        {health.improvementActions.length === 0 && (
          <div className="rounded-2xl border border-emerald-200 bg-emerald-50 px-5 py-6 flex items-center gap-4">
            <CheckCircle2 className="w-8 h-8 text-emerald-500 shrink-0" />
            <div>
              <p className="font-semibold text-emerald-900">No issues found</p>
              <p className="text-xs text-emerald-700 mt-0.5">Your account is performing well across all categories.</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
