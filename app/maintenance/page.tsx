import type { Metadata } from "next";
import { db } from "@/lib/db";
import { platformSettings } from "@/lib/db/schema";
import { inArray } from "drizzle-orm";
import { MaintenancePoller } from "./maintenance-poller";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Down for Maintenance — EditBridge",
};

function parseTime(time: string): { h: number; m: number } {
  const [h, m] = time.split(":").map(Number);
  return { h, m };
}

function to12Hour(time: string): { digits: string; period: string } {
  const { h, m } = parseTime(time);
  const period = h >= 12 ? "PM" : "AM";
  const hour = h % 12 === 0 ? 12 : h % 12;
  return { digits: `${hour}:${String(m).padStart(2, "0")}`, period };
}

function getDuration(start: string, end: string): string {
  const s = parseTime(start);
  const e = parseTime(end);
  let mins = (e.h * 60 + e.m) - (s.h * 60 + s.m);
  if (mins <= 0) mins += 24 * 60;
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  if (h === 0) return `${m} min`;
  if (m === 0) return `${h} hr${h !== 1 ? "s" : ""}`;
  return `${h} hr ${m} min`;
}

export default async function MaintenancePage() {
  const rows = await db
    .select({ key: platformSettings.key, value: platformSettings.value })
    .from(platformSettings)
    .where(inArray(platformSettings.key, ["maintenance_start", "maintenance_end"]));

  const map: Record<string, string> = {};
  for (const row of rows) map[row.key] = row.value;

  const start = map.maintenance_start ?? "";
  const end = map.maintenance_end ?? "";
  const hasWindow = !!(start && end);

  const startFmt = hasWindow ? to12Hour(start) : null;
  const endFmt   = hasWindow ? to12Hour(end)   : null;
  const duration = hasWindow ? getDuration(start, end) : null;

  return (
    <div className="min-h-screen flex items-center justify-center px-4 py-16 bg-gray-50">
      <MaintenancePoller />
      <div className="max-w-[420px] w-full text-center">

        {/* Icon */}
        <div className="flex justify-center mb-8">
          <div className="relative w-[72px] h-[72px]">
            <div
              className="absolute inset-0 rounded-[20px]"
              style={{ background: "rgba(14,165,233,0.08)", border: "1px solid rgba(14,165,233,0.18)" }}
            />
            <div className="absolute inset-0 flex items-center justify-center">
              <svg className="w-9 h-9" fill="none" viewBox="0 0 24 24" stroke="#0EA5E9" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M11.42 15.17L17.25 21A2.652 2.652 0 0021 17.25l-5.877-5.877M11.42 15.17l2.496-3.03c.317-.384.74-.626 1.208-.766M11.42 15.17l-4.655 5.653a2.548 2.548 0 11-3.586-3.586l6.837-5.63m5.108-.233c.55-.164 1.163-.188 1.743-.14a4.5 4.5 0 004.486-6.336l-3.276 3.277a3.004 3.004 0 01-2.25-2.25l3.276-3.276a4.5 4.5 0 00-6.336 4.486c.091 1.076-.071 2.264-.904 2.95l-.102.085m-1.745 1.437L5.909 7.5H4.5L2.25 3.75l1.5-1.5L7.5 4.5v1.409l4.26 4.26m-1.745 1.437l1.745-1.437m6.615 8.206L15.75 15.75M4.867 19.125h.008v.008h-.008v-.008z" />
              </svg>
            </div>
            <span
              className="absolute animate-pulse"
              style={{
                top: "-4px", right: "-4px",
                width: "14px", height: "14px",
                borderRadius: "50%",
                background: "#f59e0b",
                border: "2px solid #f9fafb",
              }}
            />
          </div>
        </div>

        {/* Wordmark */}
        <p
          className="text-[11px] font-semibold uppercase mb-2.5 text-gray-400"
          style={{ letterSpacing: "0.12em" }}
        >
          EditBridge
        </p>

        {/* Heading */}
        <h1 className="text-[28px] font-bold leading-tight mb-3 text-gray-900">
          Down for maintenance
        </h1>
        <p className="text-sm leading-relaxed mb-7 text-gray-500">
          We&apos;re making improvements to serve you better.<br />
          The platform will be back shortly.
        </p>

        {/* Time window card */}
        {hasWindow && startFmt && endFmt && duration && (
          <div className="rounded-2xl mb-6 bg-white border border-gray-100 shadow-sm overflow-hidden">
            {/* Header */}
            <div className="px-6 pt-5 pb-4 border-b border-gray-100 bg-gray-50">
              <p
                className="text-[10px] font-semibold uppercase text-center text-gray-400"
                style={{ letterSpacing: "0.12em" }}
              >
                Scheduled maintenance window &middot; IST
              </p>
            </div>

            {/* Times */}
            <div className="flex items-center px-6 py-6">
              {/* Start */}
              <div className="flex-1 text-center">
                <p className="text-[11px] font-medium mb-1.5 text-gray-400">Start</p>
                <p className="text-[26px] font-bold leading-none mb-1 text-gray-700" style={{ letterSpacing: "-0.5px" }}>
                  {startFmt.digits}
                </p>
                <p className="text-xs font-semibold text-gray-400">{startFmt.period}</p>
              </div>

              {/* Duration pill + lines */}
              <div className="flex items-center shrink-0 px-2">
                <div className="w-6 h-px bg-gray-200" />
                <div className="px-3 py-1.5 rounded-full bg-gray-100 border border-gray-200">
                  <span className="text-[11px] font-semibold text-gray-500">{duration}</span>
                </div>
                <div className="w-6 h-px bg-gray-200" />
              </div>

              {/* End */}
              <div className="flex-1 text-center">
                <p className="text-[11px] font-medium mb-1.5" style={{ color: "#0EA5E9" }}>Back online</p>
                <p className="text-[26px] font-bold leading-none mb-1" style={{ color: "#0EA5E9", letterSpacing: "-0.5px" }}>
                  {endFmt.digits}
                </p>
                <p className="text-xs font-semibold" style={{ color: "#38bdf8" }}>{endFmt.period}</p>
              </div>
            </div>
          </div>
        )}

        {/* Status pill */}
        <div className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full bg-white border border-gray-200 shadow-sm">
          <span
            className="shrink-0 animate-pulse"
            style={{ width: "7px", height: "7px", borderRadius: "50%", background: "#f59e0b" }}
          />
          <span className="text-xs font-medium text-gray-500">Maintenance in progress</span>
        </div>

      </div>
    </div>
  );
}
