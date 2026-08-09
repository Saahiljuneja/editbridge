import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { users, auditLogs } from "@/lib/db/schema";
import { sql, desc, count } from "drizzle-orm";
import { formatDate } from "@/lib/utils";
import { ShieldX, AlertCircle, Users, Ban } from "lucide-react";
import Link from "next/link";

export const dynamic = "force-dynamic";

export default async function AdminAbusePage() {
  const session = await auth();
  if (!session || session.user.role !== "admin") redirect("/admin/dashboard");

  // Users who signed up more than once with the same email domain pattern (rough heuristic)
  // Real IP dedup needs IP stored at signup — this uses email domain clustering as a proxy
  const [suspendedCount, recentSuspensions, multiAccountCandidates] = await Promise.all([
    db.select({ value: count() }).from(users).where(sql`${users.isActive} = false`).then(r => r[0].value),

    // Recent suspend actions from audit log
    db.execute(sql`
      SELECT al.id, al.action, al.created_at, u.name AS actor_name,
             t.name AS target_name, t.email AS target_email, t.id AS target_id
      FROM audit_logs al
      INNER JOIN users u ON u.id = al.actor_id
      LEFT JOIN users t ON t.id::text = al.entity_id
      WHERE al.action = 'user.suspend'
      ORDER BY al.created_at DESC
      LIMIT 20
    `),

    // Find email domains used by 3+ accounts (possible coordinated signups)
    db.execute(sql`
      SELECT SPLIT_PART(email, '@', 2) AS domain,
             COUNT(*)::int AS account_count,
             STRING_AGG(name, ', ' ORDER BY created_at) AS names,
             MIN(created_at) AS first_seen,
             MAX(created_at) AS last_seen
      FROM users
      WHERE email IS NOT NULL
        AND SPLIT_PART(email, '@', 2) NOT IN (
          'gmail.com','yahoo.com','hotmail.com','outlook.com','icloud.com',
          'protonmail.com','me.com','live.com','rediffmail.com','ymail.com',
          'googlemail.com','msn.com','aol.com'
        )
      GROUP BY 1
      HAVING COUNT(*) >= 3
      ORDER BY account_count DESC
      LIMIT 30
    `),
  ]);

  type SuspRow = { id: string; action: string; created_at: Date; actor_name: string | null; target_name: string | null; target_email: string | null; target_id: string | null };
  type DomainRow = { domain: string; account_count: number; names: string; first_seen: Date; last_seen: Date };

  const suspRows = recentSuspensions.rows as SuspRow[];
  const domainRows = multiAccountCandidates.rows as DomainRow[];

  return (
    <div className="px-8 py-6 space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Abuse Detection</h1>
        <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
          Flag suspicious multi-account patterns and review suspended users. IP-based detection requires storing IP at signup.
        </p>
      </div>

      <div className="grid grid-cols-3 gap-4">
        {[
          { label: "Suspended accounts", value: suspendedCount, icon: Ban, color: "text-red-600", bg: "bg-red-50" },
          { label: "Suspicious domains", value: domainRows.length, icon: AlertCircle, color: "text-amber-600", bg: "bg-amber-50" },
          { label: "Recent suspensions", value: suspRows.length, icon: ShieldX, color: "text-gray-600", bg: "bg-gray-50" },
        ].map(s => (
          <div key={s.label} className={`rounded-2xl ${s.bg} px-5 py-5`}>
            <s.icon className={`w-5 h-5 ${s.color} mb-2`} />
            <p className={`text-2xl font-bold ${s.color}`}>{s.value}</p>
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">{s.label}</p>
          </div>
        ))}
      </div>

      {/* IP notice */}
      <div className="rounded-2xl bg-blue-50 border border-blue-100 p-5 flex gap-4">
        <AlertCircle className="w-5 h-5 text-blue-500 shrink-0 mt-0.5" />
        <div>
          <p className="text-sm font-semibold text-blue-900">IP-based detection not yet active</p>
          <p className="text-sm text-blue-700 mt-1">
            To detect multiple accounts from the same IP, add an <code className="bg-blue-100 px-1 rounded text-xs">ip_address</code> column to the{" "}
            <code className="bg-blue-100 px-1 rounded text-xs">users</code> table and capture it at signup. The email domain heuristic below is a temporary proxy.
          </p>
        </div>
      </div>

      {/* Suspicious email domains */}
      {domainRows.length > 0 && (
        <div className="rounded-2xl border border-gray-100 dark:border-gray-800 bg-white dark:bg-gray-900 shadow-sm overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-100 dark:border-gray-800 bg-gray-50 dark:bg-gray-800/50">
            <p className="font-semibold text-gray-900 dark:text-white text-sm">Business/custom domains with 3+ accounts</p>
            <p className="text-xs text-gray-400 dark:text-gray-500 mt-0.5">Could indicate a company or coordinated signup. Review if the domain is unfamiliar.</p>
          </div>
          <div className="divide-y divide-gray-50 dark:divide-gray-800">
            {domainRows.map(row => (
              <div key={row.domain} className="flex items-center gap-4 px-6 py-3.5">
                <Users className="w-4 h-4 text-gray-400 shrink-0" />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-gray-900 dark:text-white">@{row.domain}</p>
                  <p className="text-xs text-gray-400 dark:text-gray-500 truncate">{row.names}</p>
                </div>
                <span className="text-sm font-bold text-amber-600 shrink-0">{row.account_count} accounts</span>
                <p className="text-xs text-gray-400 dark:text-gray-500 shrink-0">First: {formatDate(new Date(row.first_seen))}</p>
                <Link href={`/admin/users?q=${encodeURIComponent("@" + row.domain)}`}
                  className="text-xs font-semibold text-[var(--brand-client)] hover:underline shrink-0">
                  View &rarr;
                </Link>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Recent suspensions */}
      <div className="rounded-2xl border border-gray-100 dark:border-gray-800 bg-white dark:bg-gray-900 shadow-sm overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-100 dark:border-gray-800 bg-gray-50 dark:bg-gray-800/50 flex items-center justify-between">
          <p className="font-semibold text-gray-900 dark:text-white text-sm">Recent Suspensions</p>
          <Link href="/admin/flagged" className="text-xs font-semibold text-[var(--brand-client)] hover:underline">
            View all suspended &rarr;
          </Link>
        </div>
        {suspRows.length === 0 ? (
          <p className="text-sm text-gray-400 dark:text-gray-500 text-center py-10">No recent suspensions.</p>
        ) : (
          <div className="divide-y divide-gray-50 dark:divide-gray-800">
            {suspRows.map(row => (
              <div key={row.id} className="flex items-center gap-4 px-6 py-3.5">
                <div className="w-8 h-8 rounded-full bg-red-100 flex items-center justify-center shrink-0">
                  <Ban className="w-4 h-4 text-red-500" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-gray-900 dark:text-white">{row.target_name ?? "Unknown"}</p>
                  <p className="text-xs text-gray-400 dark:text-gray-500">{row.target_email} &middot; Suspended by {row.actor_name}</p>
                </div>
                <p className="text-xs text-gray-400 dark:text-gray-500 shrink-0">{formatDate(new Date(row.created_at))}</p>
                {row.target_id && (
                  <Link href={`/admin/users/${row.target_id}`} className="text-xs font-semibold text-[var(--brand-client)] hover:underline shrink-0">
                    Profile &rarr;
                  </Link>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
