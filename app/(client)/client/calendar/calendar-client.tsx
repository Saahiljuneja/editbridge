"use client";

import { useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import Link from "next/link";
import { cn } from "@/lib/utils";

type OrderEvent = {
  id: string;
  status: string;
  deadline: string;
  createdAt: string;
  packageTitle: string;
  editorName: string;
};

const STATUS_DOT: Record<string, string> = {
  pending:            "bg-gray-400",
  in_progress:        "bg-blue-500",
  delivered:          "bg-violet-500",
  revision_requested: "bg-amber-500",
  disputed:           "bg-red-500",
  completed:          "bg-emerald-500",
};

const DAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const MONTHS = ["January","February","March","April","May","June","July","August","September","October","November","December"];

export function CalendarClient({ orders }: { orders: OrderEvent[] }) {
  const today = new Date();
  const [year, setYear] = useState(today.getFullYear());
  const [month, setMonth] = useState(today.getMonth());
  const [selected, setSelected] = useState<string | null>(null);

  function prev() {
    if (month === 0) { setYear(y => y - 1); setMonth(11); }
    else setMonth(m => m - 1);
    setSelected(null);
  }
  function next() {
    if (month === 11) { setYear(y => y + 1); setMonth(0); }
    else setMonth(m => m + 1);
    setSelected(null);
  }

  const firstDay = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();

  // Map deadline dates to orders
  const byDate = new Map<string, OrderEvent[]>();
  for (const o of orders) {
    const d = new Date(o.deadline);
    const key = `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`;
    if (!byDate.has(key)) byDate.set(key, []);
    byDate.get(key)!.push(o);
  }

  const selectedOrders = selected ? (byDate.get(selected) ?? []) : [];

  const cells: (number | null)[] = [...Array(firstDay).fill(null), ...Array.from({ length: daysInMonth }, (_, i) => i + 1)];
  while (cells.length % 7 !== 0) cells.push(null);

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
          <button onClick={prev} className="p-1.5 rounded-lg hover:bg-gray-100 transition-colors">
            <ChevronLeft className="w-4 h-4 text-gray-500" />
          </button>
          <h2 className="font-bold text-gray-900">{MONTHS[month]} {year}</h2>
          <button onClick={next} className="p-1.5 rounded-lg hover:bg-gray-100 transition-colors">
            <ChevronRight className="w-4 h-4 text-gray-500" />
          </button>
        </div>

        <div className="p-4">
          {/* Day headers */}
          <div className="grid grid-cols-7 mb-2">
            {DAYS.map(d => (
              <div key={d} className="text-center text-[10px] font-bold text-gray-300 uppercase tracking-wider py-1">{d}</div>
            ))}
          </div>

          {/* Calendar grid */}
          <div className="grid grid-cols-7 gap-0.5">
            {cells.map((day, i) => {
              if (!day) return <div key={i} />;
              const key = `${year}-${month}-${day}`;
              const events = byDate.get(key) ?? [];
              const isToday = today.getFullYear() === year && today.getMonth() === month && today.getDate() === day;
              const isSelected = selected === key;
              const isPast = new Date(year, month, day) < new Date(today.getFullYear(), today.getMonth(), today.getDate());

              return (
                <button key={i} onClick={() => setSelected(isSelected ? null : key)}
                  className={cn(
                    "relative rounded-xl p-1.5 text-center transition-all min-h-[52px] flex flex-col items-center",
                    isSelected ? "bg-[var(--brand-client)]/10 ring-1 ring-[var(--brand-client)]/30" : "hover:bg-gray-50",
                    events.length > 0 && !isSelected ? "bg-sky-50/50" : "",
                  )}>
                  <span className={cn(
                    "text-sm font-medium w-7 h-7 flex items-center justify-center rounded-full",
                    isToday ? "bg-[var(--brand-client)] text-white" : isPast ? "text-gray-300" : "text-gray-700",
                  )}>
                    {day}
                  </span>
                  {events.length > 0 && (
                    <div className="flex gap-0.5 mt-1 flex-wrap justify-center">
                      {events.slice(0, 3).map((e, j) => (
                        <span key={j} className={cn("w-1.5 h-1.5 rounded-full", STATUS_DOT[e.status] ?? "bg-gray-400")} />
                      ))}
                    </div>
                  )}
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* Legend */}
      <div className="flex flex-wrap gap-4 px-1">
        {[
          { label: "In progress", dot: "bg-blue-500" },
          { label: "Delivered", dot: "bg-violet-500" },
          { label: "Revision", dot: "bg-amber-500" },
          { label: "Completed", dot: "bg-emerald-500" },
          { label: "Disputed", dot: "bg-red-500" },
        ].map(({ label, dot }) => (
          <div key={label} className="flex items-center gap-1.5 text-xs text-gray-500">
            <span className={cn("w-2 h-2 rounded-full", dot)} />
            {label}
          </div>
        ))}
      </div>

      {/* Selected day panel */}
      {selectedOrders.length > 0 && (
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
          <div className="px-5 py-4 border-b border-gray-100">
            <p className="font-semibold text-gray-900 text-sm">
              Deadlines on {selected ? (() => {
                const [y, m, d] = selected.split("-").map(Number);
                return new Date(y, m, d).toLocaleDateString("en-IN", { day: "numeric", month: "long", year: "numeric" });
              })() : ""}
            </p>
          </div>
          <div className="divide-y divide-gray-50">
            {selectedOrders.map((o) => (
              <Link key={o.id} href={`/orders/${o.id}`}
                className="flex items-center gap-4 px-5 py-4 hover:bg-gray-50 transition-colors">
                <span className={cn("w-2.5 h-2.5 rounded-full shrink-0", STATUS_DOT[o.status] ?? "bg-gray-400")} />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-900 truncate">{o.packageTitle}</p>
                  <p className="text-xs text-gray-400">with {o.editorName}</p>
                </div>
                <span className="text-xs font-semibold text-[var(--brand-client)]">View →</span>
              </Link>
            ))}
          </div>
        </div>
      )}

      {/* Upcoming deadlines list */}
      {orders.length > 0 && (
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
          <div className="px-5 py-4 border-b border-gray-100">
            <p className="font-semibold text-gray-900 text-sm">All deadlines</p>
          </div>
          <div className="divide-y divide-gray-50">
            {[...orders]
              .sort((a, b) => new Date(a.deadline).getTime() - new Date(b.deadline).getTime())
              .map((o) => {
                const d = new Date(o.deadline);
                const isPast = d < today;
                const diffDays = Math.ceil((d.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
                return (
                  <Link key={o.id} href={`/orders/${o.id}`}
                    className="flex items-center gap-4 px-5 py-3.5 hover:bg-gray-50 transition-colors">
                    <div className="text-center w-10 shrink-0">
                      <p className="text-[10px] font-bold text-gray-400 uppercase">{MONTHS[d.getMonth()].slice(0, 3)}</p>
                      <p className="text-xl font-bold text-gray-900 leading-none">{d.getDate()}</p>
                    </div>
                    <span className={cn("w-2 h-2 rounded-full shrink-0", STATUS_DOT[o.status] ?? "bg-gray-400")} />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-gray-900 truncate">{o.packageTitle}</p>
                      <p className="text-xs text-gray-400">{o.editorName}</p>
                    </div>
                    <span className={cn("text-xs font-semibold shrink-0",
                      isPast ? "text-red-500" : diffDays <= 2 ? "text-amber-600" : "text-gray-400")}>
                      {isPast ? "Overdue" : diffDays === 0 ? "Today" : `${diffDays}d left`}
                    </span>
                  </Link>
                );
              })}
          </div>
        </div>
      )}

      {orders.length === 0 && (
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-12 text-center">
          <p className="font-semibold text-gray-700">No upcoming deadlines</p>
          <p className="text-xs text-gray-400 mt-1">Your order deadlines will appear here once you place orders.</p>
        </div>
      )}
    </div>
  );
}
