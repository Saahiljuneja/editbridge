"use client";

import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import {
  HelpCircle, CreditCard, RefreshCw, MessageSquare,
  ShieldCheck, Star, Clock, AlertCircle, ArrowRight,
  Mail, BookOpen, Users, Search, X, ChevronRight,
} from "lucide-react";
import { useState, useMemo } from "react";
import { cn } from "@/lib/utils";

/* ══════════════════════════════════════════════
   DATA
══════════════════════════════════════════════ */
const SECTIONS = [
  {
    id: "getting-started",
    icon: BookOpen,
    accent: "#7c6ff7",
    title: "Getting started",
    faqs: [
      { q: "How does EditBridge work?", a: "Browse verified video editors, choose a package that fits your project, and pay securely. Your payment is held until you approve the delivery. Once you approve, the editor gets paid. Four steps: browse, pay, collaborate, approve." },
      { q: "How do I place an order?", a: "Find an editor on the Browse page, review their packages, and click 'Book Now'. Complete checkout with Razorpay. You'll receive a confirmation and can track progress from My Orders." },
      { q: "Are editors verified?", a: "Yes. Every editor has completed KYC identity verification with a government-issued ID and been reviewed by our team before their profile goes live. You'll see a verified badge on all approved profiles." },
      { q: "Do I need to create an account?", a: "You can browse editors without an account, but you'll need to sign up as a client to place an order and message editors." },
    ],
  },
  {
    id: "payments",
    icon: CreditCard,
    accent: "#34d399",
    title: "Payments & fees",
    faqs: [
      { q: "Is my payment secure?", a: "Yes. Payments are processed by Razorpay and held securely until you approve the delivery. Your money is never transferred to the editor until you explicitly approve the work." },
      { q: "What does EditBridge charge?", a: "Clients pay a 10% processing fee on the package price at checkout. Editors pay a 20% platform commission on each completed delivery. There are no hidden charges." },
      { q: "When does the editor get paid?", a: "The editor's payout is released 7 days after you approve the delivery. This window gives you time to flag any final issues before funds are transferred." },
      { q: "What payment methods are accepted?", a: "We accept all major credit and debit cards, UPI, net banking, and wallets via Razorpay." },
    ],
  },
  {
    id: "revisions",
    icon: RefreshCw,
    accent: "#38bdf8",
    title: "Revisions & quality",
    faqs: [
      { q: "What if I need revisions?", a: "Each package includes a set number of revisions stated in the listing. Request a revision from the order page and the editor will re-deliver within their stated delivery time." },
      { q: "How long does delivery take?", a: "Delivery time depends on the package selected — you'll see the exact delivery days on each package card. Editors are required to deliver within that timeframe." },
      { q: "What format will I receive the files in?", a: "Final files are typically H.264 MP4 at 1080p or 4K, depending on your brief. Mention your preferred format and resolution when placing the order." },
    ],
  },
  {
    id: "disputes",
    icon: AlertCircle,
    accent: "#f87171",
    title: "Disputes & refunds",
    faqs: [
      { q: "What if I'm unhappy with the work?", a: "If revisions don't resolve your concerns, you can open a dispute from the order page. Our support team reviews all disputes and may issue a full or partial refund based on the circumstances." },
      { q: "Can I cancel an order?", a: "Orders can be cancelled before the editor starts work. Once work has begun, cancellation is subject to dispute resolution. Contact support if you're in this situation." },
      { q: "How long does dispute resolution take?", a: "Our team aims to resolve disputes within 3–5 business days. Complex cases may take longer. You'll receive updates via email." },
    ],
  },
  {
    id: "editors",
    icon: Users,
    accent: "#fbbf24",
    title: "For editors",
    faqs: [
      { q: "How do I become an editor on EditBridge?", a: "Sign up as an editor, complete your profile, and submit your KYC documents. Once verified, your profile goes live and clients can place orders with you." },
      { q: "What commission does EditBridge take?", a: "EditBridge takes a 20% commission on each order. The remaining 80% of the package price is credited to your payout, released 7 days after client approval." },
      { q: "How do I receive my payouts?", a: "Payouts are processed 7 days after client approval via Razorpay. Ensure your bank account details are up to date in your payout settings." },
    ],
  },
];

/* ══════════════════════════════════════════════
   ACCORDION ITEM
══════════════════════════════════════════════ */
function AccordionItem({ q, a, accent, index }: { q: string; a: string; accent: string; index: number }) {
  const [open, setOpen] = useState(false);
  return (
    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.05, duration: 0.4, ease: [0.22, 1, 0.36, 1] }}>
      <button onClick={() => setOpen(o => !o)} className="w-full text-left group">
        <div className={cn(
          "rounded-2xl border transition-all duration-300 overflow-hidden",
          open ? "shadow-[0_4px_24px_rgba(0,0,0,0.07)]" : "hover:border-gray-200 bg-white"
        )} style={{ borderColor: open ? `${accent}30` : undefined }}>
          <div className="flex items-center gap-4 px-6 py-5">
            {/* Animated dot */}
            <motion.div animate={{ scale: open ? 1.2 : 1, background: open ? accent : "#e5e7eb" }}
              transition={{ duration: 0.2 }}
              className="w-2 h-2 rounded-full shrink-0" />
            <span className="text-gray-900 font-semibold text-sm flex-1 leading-snug">{q}</span>
            <motion.div animate={{ rotate: open ? 45 : 0 }} transition={{ duration: 0.2 }}
              className={cn("w-6 h-6 rounded-lg flex items-center justify-center shrink-0 transition-colors",
                open ? "text-white" : "text-gray-400")}
              style={{ background: open ? accent : "transparent", border: open ? "none" : "1px solid #e5e7eb" }}>
              <span className="text-sm font-black leading-none">+</span>
            </motion.div>
          </div>
          <AnimatePresence initial={false}>
            {open && (
              <motion.div initial={{ height: 0 }} animate={{ height: "auto" }} exit={{ height: 0 }}
                transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }} className="overflow-hidden">
                <div className="px-6 pb-5 pl-[3.5rem]">
                  <p className="text-gray-500 text-sm leading-relaxed">{a}</p>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </button>
    </motion.div>
  );
}

/* ══════════════════════════════════════════════
   PAGE
══════════════════════════════════════════════ */
export default function FAQPage() {
  const [search, setSearch] = useState("");
  const [activeId, setActiveId] = useState("getting-started");

  // Filter across all sections when searching
  const searchResults = useMemo(() => {
    if (!search.trim()) return null;
    const q = search.toLowerCase();
    const results: { section: string; accent: string; q: string; a: string }[] = [];
    SECTIONS.forEach(s => {
      s.faqs.forEach(f => {
        if (f.q.toLowerCase().includes(q) || f.a.toLowerCase().includes(q)) {
          results.push({ section: s.title, accent: s.accent, q: f.q, a: f.a });
        }
      });
    });
    return results;
  }, [search]);

  const activeSection = SECTIONS.find(s => s.id === activeId)!;

  return (
    <div className="flex flex-col min-h-screen bg-white">

      {/* ══ HERO ══ */}
      <section className="relative bg-slate-50/50 border-b border-neutral-200/50 pt-24 pb-20 px-6 overflow-hidden">
        <div className="absolute inset-0 opacity-[0.035]" style={{ backgroundImage: "radial-gradient(rgba(0,0,0,0.8) 1px,transparent 1px)", backgroundSize: "28px 28px" }} />
        <div className="absolute top-0 left-1/3 w-96 h-96 rounded-full blur-[130px] opacity-[0.08] pointer-events-none" style={{ background: "#7c6ff7" }} />
        <div className="absolute bottom-0 right-1/4 w-64 h-64 rounded-full blur-[100px] opacity-[0.05] pointer-events-none" style={{ background: "#34d399" }} />

        <div className="relative z-10 px-8 py-6 text-center">
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1] }}>
            <div className="w-14 h-14 rounded-2xl bg-[#7c6ff7]/10 border border-[#7c6ff7]/20 flex items-center justify-center mx-auto mb-7">
              <HelpCircle className="w-7 h-7 text-[#7c6ff7]" />
            </div>
            <div className="inline-flex items-center gap-2 border border-violet-200 bg-violet-50 text-violet-750 text-[11px] font-black tracking-[0.2em] uppercase px-4 py-2 rounded-full mb-7">
              Help centre
            </div>
            <h1 className="text-5xl sm:text-6xl font-black text-neutral-900 tracking-tight leading-[0.93] mb-5">
              How can we<br />
              <span className="text-transparent bg-clip-text" style={{ backgroundImage: "linear-gradient(135deg,#7c6ff7,#34d399)" }}>
                help you?
              </span>
            </h1>
            <p className="text-neutral-500 text-lg mb-10 px-8 py-6 leading-relaxed">
              {SECTIONS.reduce((t, s) => t + s.faqs.length, 0)} answers to the most common questions about EditBridge.
            </p>

            {/* Search */}
            <div className="relative px-8 py-6 max-w-xl mx-auto">
              <Search className="absolute left-12 top-1/2 -translate-y-1/2 w-5 h-5 text-neutral-450 pointer-events-none" />
              <input value={search} onChange={e => setSearch(e.target.value)}
                placeholder="Search questions…"
                className="w-full bg-white border border-neutral-200 text-neutral-800 placeholder-neutral-400 rounded-2xl pl-12 pr-12 py-4 text-sm font-medium outline-none focus:border-[#7c6ff7]/55 transition-all shadow-sm" />
              {search && (
                <button onClick={() => setSearch("")} className="absolute right-12 top-1/2 -translate-y-1/2 text-neutral-400 hover:text-neutral-600 transition-colors">
                  <X className="w-4 h-4" />
                </button>
              )}
            </div>
          </motion.div>
        </div>
      </section>

      {/* ══ SEARCH RESULTS ══ */}
      <AnimatePresence>
        {searchResults && (
          <motion.section initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
            className="py-12 px-6 bg-gray-50 border-b border-gray-100">
            <div className="px-8 py-6">
              <p className="text-[11px] font-black text-gray-400 uppercase tracking-widest mb-5">
                {searchResults.length === 0 ? "No results" : `${searchResults.length} result${searchResults.length !== 1 ? "s" : ""} for "${search}"`}
              </p>
              {searchResults.length === 0 ? (
                <div className="text-center py-10">
                  <p className="text-gray-400 text-sm mb-4">We couldn't find anything matching that.</p>
                  <a href="mailto:support@editbridge.in" className="inline-flex items-center gap-2 text-[#7c6ff7] text-sm font-semibold hover:underline underline-offset-2">
                    <Mail className="w-4 h-4" /> Email our support team
                  </a>
                </div>
              ) : (
                <div className="space-y-3">
                  {searchResults.map((r, i) => (
                    <AccordionItem key={i} q={r.q} a={r.a} accent={r.accent} index={i} />
                  ))}
                </div>
              )}
            </div>
          </motion.section>
        )}
      </AnimatePresence>

      {/* ══ MAIN CONTENT — two column ══ */}
      {!search && (
        <section className="flex-1 py-16 px-6">
          <div className="px-8 py-6 flex gap-10 items-start">

            {/* Left: sticky category nav */}
            <aside className="hidden lg:flex flex-col gap-1.5 w-60 shrink-0 sticky top-24">
              <p className="text-[10px] font-black text-gray-400 uppercase tracking-[0.28em] px-3 mb-3">Categories</p>
              {SECTIONS.map(s => {
                const Icon = s.icon;
                const isActive = activeId === s.id;
                return (
                  <button key={s.id} onClick={() => setActiveId(s.id)}
                    className={cn("flex items-center gap-3 px-3 py-3 rounded-2xl text-left transition-all group w-full",
                      isActive ? "shadow-[0_2px_16px_rgba(0,0,0,0.08)]" : "hover:bg-gray-50")}
                    style={isActive ? { background: `${s.accent}0c`, border: `1px solid ${s.accent}25` } : {}}>
                    <div className="w-8 h-8 rounded-xl flex items-center justify-center shrink-0 transition-all"
                      style={{ background: isActive ? `${s.accent}20` : "#f3f4f6" }}>
                      <Icon className="w-4 h-4 transition-colors" style={{ color: isActive ? s.accent : "#9ca3af" }} />
                    </div>
                    <span className={cn("text-sm font-semibold flex-1 transition-colors", isActive ? "text-gray-900" : "text-gray-500 group-hover:text-gray-700")}>
                      {s.title}
                    </span>
                    <span className="text-[10px] font-bold rounded-full px-2 py-0.5 transition-all"
                      style={isActive ? { color: s.accent, background: `${s.accent}15` } : { color: "#d1d5db", background: "#f9fafb" }}>
                      {s.faqs.length}
                    </span>
                  </button>
                );
              })}

              {/* Divider + contact */}
              <div className="mt-6 pt-6 border-t border-gray-100">
                <a href="mailto:support@editbridge.in"
                  className="flex items-center gap-3 px-3 py-3 rounded-2xl text-left hover:bg-gray-50 transition-all group w-full">
                  <div className="w-8 h-8 rounded-xl bg-gray-100 flex items-center justify-center shrink-0">
                    <Mail className="w-4 h-4 text-gray-400 group-hover:text-gray-600 transition-colors" />
                  </div>
                  <span className="text-sm font-semibold text-gray-400 group-hover:text-gray-700 transition-colors">Email support</span>
                </a>
              </div>
            </aside>

            {/* Right: questions */}
            <div className="flex-1 min-w-0">

              {/* Mobile category tabs */}
              <div className="flex gap-2 overflow-x-auto pb-2 mb-8 lg:hidden">
                {SECTIONS.map(s => {
                  const isActive = activeId === s.id;
                  return (
                    <button key={s.id} onClick={() => setActiveId(s.id)}
                      className="shrink-0 text-[11px] font-bold px-3 py-2 rounded-full transition-all"
                      style={isActive ? { background: s.accent, color: "white" } : { background: "#f3f4f6", color: "#6b7280" }}>
                      {s.title}
                    </button>
                  );
                })}
              </div>

              <AnimatePresence mode="wait">
                <motion.div key={activeId}
                  initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }}
                  transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}>

                  {/* Section header */}
                  <div className="flex items-center gap-4 mb-8">
                    <div className="w-12 h-12 rounded-2xl flex items-center justify-center"
                      style={{ background: `${activeSection.accent}15` }}>
                      <activeSection.icon className="w-6 h-6" style={{ color: activeSection.accent }} />
                    </div>
                    <div>
                      <h2 className="text-2xl font-black text-gray-900">{activeSection.title}</h2>
                      <p className="text-gray-400 text-sm">{activeSection.faqs.length} questions</p>
                    </div>
                  </div>

                  {/* Accordion */}
                  <div className="space-y-2.5">
                    {activeSection.faqs.map((faq, i) => (
                      <AccordionItem key={faq.q} q={faq.q} a={faq.a} accent={activeSection.accent} index={i} />
                    ))}
                  </div>

                  {/* Category nav buttons */}
                  <div className="flex items-center justify-between mt-10 pt-8 border-t border-gray-100">
                    {(() => {
                      const idx = SECTIONS.findIndex(s => s.id === activeId);
                      const prev = SECTIONS[idx - 1];
                      const next = SECTIONS[idx + 1];
                      return (
                        <>
                          {prev ? (
                            <button onClick={() => setActiveId(prev.id)}
                              className="flex items-center gap-2 text-sm font-semibold text-gray-400 hover:text-gray-700 transition-colors">
                              <ChevronRight className="w-4 h-4 rotate-180" /> {prev.title}
                            </button>
                          ) : <div />}
                          {next && (
                            <button onClick={() => setActiveId(next.id)}
                              className="flex items-center gap-2 text-sm font-semibold text-gray-400 hover:text-gray-700 transition-colors">
                              {next.title} <ChevronRight className="w-4 h-4" />
                            </button>
                          )}
                        </>
                      );
                    })()}
                  </div>
                </motion.div>
              </AnimatePresence>
            </div>
          </div>
        </section>
      )}

      {/* ══ BOTTOM STRIP ══ */}
      {!search && (
        <section className="py-16 px-6 bg-gray-50 border-t border-gray-100">
          <div className="px-8 py-6">

            {/* Still need help */}
            <div className="rounded-3xl overflow-hidden mb-8" style={{ background: "linear-gradient(145deg,#06040f,#1a1040)" }}>
              <div className="relative px-10 py-12 flex flex-col sm:flex-row items-center justify-between gap-8">
                <div className="absolute inset-0 opacity-[0.04]" style={{ backgroundImage: "radial-gradient(rgba(255,255,255,0.8) 1px,transparent 1px)", backgroundSize: "24px 24px" }} />
                <div className="absolute top-0 right-0 w-48 h-48 rounded-full blur-[80px] opacity-20 pointer-events-none" style={{ background: "#7c6ff7" }} />
                <div className="relative text-center sm:text-left">
                  <h3 className="text-white font-black text-2xl mb-2">Still need help?</h3>
                  <p className="text-white/40 text-sm">Our support team responds within 24 hours on business days.</p>
                </div>
                <div className="relative flex gap-3 flex-wrap justify-center">
                  <a href="mailto:support@editbridge.in"
                    className="inline-flex items-center gap-2 bg-[#7c6ff7] hover:bg-[#6a5ef0] text-white font-bold px-6 py-3 rounded-xl text-sm transition-all shadow-[0_6px_20px_rgba(124,111,247,0.4)]">
                    <Mail className="w-4 h-4" /> support@editbridge.in
                  </a>
                  <Link href="/contact"
                    className="inline-flex items-center gap-2 border border-white/10 text-white/60 hover:text-white hover:border-white/20 font-medium px-6 py-3 rounded-xl text-sm transition-all">
                    Contact page <ArrowRight className="w-4 h-4" />
                  </Link>
                </div>
              </div>
            </div>

            {/* Quick links */}
            <div className="grid sm:grid-cols-3 gap-4">
              {[
                { icon: Star,        label: "Browse editors",  sub: "Find your perfect editor",   href: "/browse",        accent: "#7c6ff7" },
                { icon: Clock,       label: "How it works",    sub: "The full process explained",  href: "/how-it-works",  accent: "#34d399" },
                { icon: ShieldCheck, label: "Contact us",     sub: "Didn't find your answer?",    href: "/contact",       accent: "#fbbf24" },
              ].map(({ icon: Icon, label, sub, href, accent }) => (
                <Link key={href} href={href}
                  className="flex items-center gap-4 p-5 rounded-2xl border border-gray-100 bg-white hover:border-gray-200 hover:shadow-[0_4px_20px_rgba(0,0,0,0.06)] transition-all group">
                  <div className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0" style={{ background: `${accent}15` }}>
                    <Icon className="w-5 h-5" style={{ color: accent }} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-gray-900 font-bold text-sm">{label}</p>
                    <p className="text-gray-400 text-xs mt-0.5">{sub}</p>
                  </div>
                  <ArrowRight className="w-4 h-4 text-gray-300 group-hover:text-gray-500 group-hover:translate-x-0.5 transition-all shrink-0" />
                </Link>
              ))}
            </div>
          </div>
        </section>
      )}
    </div>
  );
}