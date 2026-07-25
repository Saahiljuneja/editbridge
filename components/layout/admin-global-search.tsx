"use client";

import { useState, useRef, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Search, Users, ShoppingBag, AlertTriangle, X } from "lucide-react";
import { cn } from "@/lib/utils";

type Result = {
  users: { id: string; name: string | null; email: string; role: string }[];
  orders: { id: string; status: string; packageTitle: string; clientName: string | null }[];
  disputes: { id: string; reason: string; status: string }[];
};

export function AdminGlobalSearch() {
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<Result | null>(null);
  const [loading, setLoading] = useState(false);
  const [open, setOpen] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (query.length < 2) { setResults(null); return; }
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(async () => {
      setLoading(true);
      try {
        const res = await fetch(`/api/admin/search?q=${encodeURIComponent(query)}`);
        const data = await res.json();
        setResults(data);
      } finally { setLoading(false); }
    }, 300);
  }, [query]);

  // Cmd/Ctrl+K shortcut
  useEffect(() => {
    function handler(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault();
        setOpen(true);
        setTimeout(() => inputRef.current?.focus(), 50);
      }
      if (e.key === "Escape") setOpen(false);
    }
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, []);

  const hasResults = results && (results.users.length + results.orders.length + results.disputes.length) > 0;

  function go(href: string) {
    setOpen(false);
    setQuery("");
    setResults(null);
    router.push(href);
  }

  return (
    <>
      {/* Trigger button */}
      <button
        onClick={() => { setOpen(true); setTimeout(() => inputRef.current?.focus(), 50); }}
        className="flex items-center gap-2 px-3 py-2 rounded-lg border border-white/[0.08] bg-white/[0.05] hover:bg-white/10 text-gray-500 transition-colors w-full"
      >
        <Search className="w-3.5 h-3.5 shrink-0" />
        <span className="flex-1 text-left text-[12.5px]">Search</span>
        <kbd className="text-[10px] font-medium bg-white/10 border border-white/10 rounded px-1.5 py-0.5 text-gray-600">⌘K</kbd>
      </button>

      {/* Modal */}
      {open && (
        <div className="fixed inset-0 z-50 flex items-start justify-center pt-20 px-4">
          <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={() => setOpen(false)} />
          <div className="relative bg-gray-900 rounded-2xl shadow-2xl border border-white/10 w-full max-w-lg overflow-hidden">
            <div className="flex items-center gap-3 px-4 py-3 border-b border-white/[0.06]">
              <Search className="w-4 h-4 text-gray-500 shrink-0" />
              <input
                ref={inputRef}
                value={query}
                onChange={e => setQuery(e.target.value)}
                placeholder="Search users, orders, disputes…"
                className="flex-1 text-sm outline-none bg-transparent text-gray-100 placeholder:text-gray-600"
              />
              {query && (
                <button onClick={() => { setQuery(""); setResults(null); }} className="text-gray-600 hover:text-gray-400">
                  <X className="w-4 h-4" />
                </button>
              )}
            </div>

            <div className="max-h-96 overflow-y-auto">
              {loading && <p className="text-xs text-gray-500 text-center py-6">Searching…</p>}
              {!loading && query.length >= 2 && !hasResults && (
                <p className="text-xs text-gray-500 text-center py-6">No results for "{query}"</p>
              )}
              {!loading && query.length < 2 && (
                <p className="text-xs text-gray-600 text-center py-6">Type at least 2 characters…</p>
              )}

              {results?.users && results.users.length > 0 && (
                <div>
                  <p className="text-[10px] font-bold uppercase tracking-wider text-gray-600 px-4 pt-3 pb-1">Users</p>
                  {results.users.map(u => (
                    <button key={u.id} onClick={() => go(`/admin/users/${u.id}`)}
                      className="w-full flex items-center gap-3 px-4 py-2.5 hover:bg-white/[0.05] transition-colors text-left">
                      <div className="w-7 h-7 rounded-lg bg-blue-900/40 flex items-center justify-center shrink-0">
                        <Users className="w-3.5 h-3.5 text-blue-400" />
                      </div>
                      <div className="min-w-0">
                        <p className="text-sm font-medium text-gray-200 truncate">{u.name ?? u.email}</p>
                        <p className="text-xs text-gray-500 truncate">{u.email} · {u.role}</p>
                      </div>
                    </button>
                  ))}
                </div>
              )}

              {results?.orders && results.orders.length > 0 && (
                <div>
                  <p className="text-[10px] font-bold uppercase tracking-wider text-gray-600 px-4 pt-3 pb-1">Orders</p>
                  {results.orders.map(o => (
                    <button key={o.id} onClick={() => go(`/admin/orders/${o.id}`)}
                      className="w-full flex items-center gap-3 px-4 py-2.5 hover:bg-white/[0.05] transition-colors text-left">
                      <div className="w-7 h-7 rounded-lg bg-emerald-900/40 flex items-center justify-center shrink-0">
                        <ShoppingBag className="w-3.5 h-3.5 text-emerald-400" />
                      </div>
                      <div className="min-w-0">
                        <p className="text-sm font-medium text-gray-200 truncate">{o.packageTitle}</p>
                        <p className="text-xs text-gray-500 truncate">{o.clientName} · {o.status}</p>
                      </div>
                    </button>
                  ))}
                </div>
              )}

              {results?.disputes && results.disputes.length > 0 && (
                <div className="pb-2">
                  <p className="text-[10px] font-bold uppercase tracking-wider text-gray-600 px-4 pt-3 pb-1">Disputes</p>
                  {results.disputes.map(d => (
                    <button key={d.id} onClick={() => go(`/admin/disputes/${d.id}`)}
                      className="w-full flex items-center gap-3 px-4 py-2.5 hover:bg-white/[0.05] transition-colors text-left">
                      <div className="w-7 h-7 rounded-lg bg-red-900/40 flex items-center justify-center shrink-0">
                        <AlertTriangle className="w-3.5 h-3.5 text-red-400" />
                      </div>
                      <div className="min-w-0">
                        <p className="text-sm font-medium text-gray-200 truncate">{d.reason}</p>
                        <p className="text-xs text-gray-500">{d.status}</p>
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
}
