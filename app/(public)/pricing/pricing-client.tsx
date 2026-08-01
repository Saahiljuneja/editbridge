"use client";

import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import {
  CheckCircle, ArrowRight, Lock, ShieldCheck,
  IndianRupee, Zap, ArrowDown, Award, Star, StarHalf, ShieldAlert
} from "lucide-react";
import { useState } from "react";
import { cn } from "@/lib/utils";

/* ══════════════════════════════════════════════
   HELPERS
   ══════════════════════════════════════════════ */
function Reveal({ children, delay = 0, className = "" }: { children: React.ReactNode; delay?: number; className?: string }) {
  return (
    <motion.div initial={{ opacity: 0, y: 28 }} whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-50px" }} transition={{ duration: 0.75, delay, ease: [0.22, 1, 0.36, 1] }}
      className={className}>
      {children}
    </motion.div>
  );
}

/* ══════════════════════════════════════════════
   LIVE CALCULATOR
   ══════════════════════════════════════════════ */
function Calculator() {
  const [amount, setAmount] = useState(3500);
  const fee     = Math.round(amount * 0.04);
  const total   = amount + fee;
  const editor  = Math.round(amount * 0.85);
  const platform = amount - editor;

  const clamp = (v: number) => Math.max(500, Math.min(50000, v));

  return (
    <div className="relative">
      <div className="absolute -inset-6 rounded-[2rem] blur-2xl opacity-30 pointer-events-none bg-[#7c6ff7]" />

      <div className="relative rounded-3xl overflow-hidden border border-white/10"
        style={{ background: "linear-gradient(145deg,rgba(255,255,255,0.07) 0%,rgba(255,255,255,0.03) 100%)", backdropFilter: "blur(20px)" }}>

        <div className="px-7 pt-7 pb-5 border-b border-white/[0.06]">
          <p className="text-white/40 text-[11px] font-black tracking-[0.22em] uppercase mb-3">Live fee calculator</p>
          <div className="flex items-center gap-3">
            <span className="text-white/30 text-2xl font-black">₹</span>
            <input
              type="number" value={amount}
              onChange={e => setAmount(clamp(Number(e.target.value) || 500))}
              className="bg-transparent text-white text-5xl font-black w-full outline-none placeholder-white/20 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
              placeholder="3500"
            />
          </div>
          <input type="range" min={500} max={50000} step={100} value={amount}
            onChange={e => setAmount(Number(e.target.value))}
            className="w-full mt-4 accent-[#7c6ff7] cursor-pointer" />
          <div className="flex justify-between text-[10px] text-white/20 mt-1 font-mono">
            <span>₹500</span><span>₹50,000</span>
          </div>
        </div>

        <div className="p-7 space-y-3">
          <div className="rounded-2xl p-4 border border-white/[0.06]" style={{ background: "rgba(52,211,153,0.06)" }}>
            <p className="text-[10px] font-black tracking-widest text-emerald-400/70 uppercase mb-3">Client pays</p>
            <div className="space-y-2">
              <div className="flex justify-between items-center">
                <span className="text-white/50 text-xs">Package price</span>
                <span className="text-white font-semibold text-sm">₹{amount.toLocaleString("en-IN")}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-white/50 text-xs">Processing fee (4%)</span>
                <span className="text-white/60 text-sm">₹{fee.toLocaleString("en-IN")}</span>
              </div>
              <div className="h-px bg-white/[0.06] my-1" />
              <div className="flex justify-between items-center">
                <span className="text-emerald-300 text-sm font-bold">Total charged</span>
                <motion.span key={total} initial={{ scale: 1.1 }} animate={{ scale: 1 }}
                  className="text-emerald-300 font-black text-xl">
                  ₹{total.toLocaleString("en-IN")}
                </motion.span>
              </div>
            </div>
          </div>

          <div className="flex items-center justify-center gap-3 py-1">
            <div className="h-px flex-1 bg-white/[0.06]" />
            <ArrowDown className="w-4 h-4 text-white/15" />
            <div className="h-px flex-1 bg-white/[0.06]" />
          </div>

          <div className="rounded-2xl p-4 border border-white/[0.06]" style={{ background: "rgba(124,111,247,0.07)" }}>
            <p className="text-[10px] font-black tracking-widest text-[#7c6ff7]/70 uppercase mb-3">Editor receives</p>
            <div className="space-y-2">
              <div className="flex justify-between items-center">
                <span className="text-white/50 text-xs">Platform fee (15%)</span>
                <span className="text-white/40 text-sm">−₹{platform.toLocaleString("en-IN")}</span>
              </div>
              <div className="h-px bg-white/[0.06] my-1" />
              <div className="flex justify-between items-center">
                <span className="text-[#a89cf7] text-sm font-bold">Editor payout (85%)</span>
                <motion.span key={editor} initial={{ scale: 1.1 }} animate={{ scale: 1 }}
                  className="text-[#a89cf7] font-black text-xl">
                  ₹{editor.toLocaleString("en-IN")}
                </motion.span>
              </div>
            </div>
          </div>

          <div className="pt-2">
            <div className="flex rounded-full overflow-hidden h-3 bg-white/[0.05]">
              <motion.div animate={{ width: `${85}%` }} transition={{ duration: 0.6, ease: [0.22,1,0.36,1] }}
                className="h-full rounded-l-full" style={{ background: "linear-gradient(90deg,#7c6ff7,#a89cf7)" }} />
              <motion.div animate={{ width: `${15}%` }} transition={{ duration: 0.6, ease: [0.22,1,0.36,1] }}
                className="h-full" style={{ background: "rgba(255,255,255,0.1)" }} />
            </div>
            <div className="flex justify-between text-[10px] mt-1.5 font-semibold">
              <span className="text-[#a89cf7]/70">Editor 85%</span>
              <span className="text-white/20">Platform 15%</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ══════════════════════════════════════════════
   FAQ DATA
   ══════════════════════════════════════════════ */
const FAQ = [
  { q: "What is the processing fee?",
    a: "A flat 4% fee added to the client's total at checkout. It covers payment gateway costs and is charged separately from the editor's package price." },
  { q: "When is the processing fee charged?",
    a: "At checkout, immediately when you place the order. It is non-refundable as it covers payment gateway costs incurred at that moment." },
  { q: "When is the editor's commission deducted?",
    a: "Only when the order is completed and the client approves the delivery. If an order is cancelled before delivery begins, no commission is charged." },
  { q: "Are there any other fees for editors?",
    a: "None by default. If the membership plans feature is enabled, editors can optionally upgrade to a paid tier (Starter, Pro, Agency) to reduce platform commission down to as low as 3%, get verified badges, and unlock unlimited portfolios." },
  { q: "What counts as a completed order?",
    a: "An order is completed when the client clicks 'Approve delivery', or after 7 days of inaction following delivery (auto-approval)." },
  { q: "What about GST?",
    a: "Editors are responsible for their own tax obligations. EditBridge does not collect or remit GST on behalf of editors. Please consult a tax advisor." },
];

function PricingFAQ() {
  const [active, setActive] = useState(0);
  const icons = ["💳", "⏱️", "✅", "🚫", "📦", "🧾"];

  return (
    <div className="grid lg:grid-cols-[1fr_1.1fr] gap-6 items-start">
      <div className="space-y-2">
        {FAQ.map(({ q }, i) => {
          const isActive = active === i;
          return (
            <button key={i} onClick={() => setActive(i)}
              className={cn(
                "w-full text-left rounded-2xl px-5 py-4 transition-all duration-200 flex items-center gap-4 group",
                isActive
                  ? "bg-[#06040f] shadow-[0_8px_32px_rgba(0,0,0,0.18)]"
                  : "bg-gray-50 hover:bg-gray-100 border border-transparent hover:border-gray-200"
              )}>
              <span className={cn(
                "w-8 h-8 rounded-xl flex items-center justify-center text-[11px] font-black shrink-0 transition-all",
                isActive ? "bg-[#7c6ff7] text-white" : "bg-gray-200 text-gray-400 group-hover:bg-gray-300"
              )}>
                {String(i + 1).padStart(2, "0")}
              </span>
              <span className={cn(
                "text-sm font-semibold leading-snug transition-colors",
                isActive ? "text-white" : "text-gray-700 group-hover:text-gray-900"
              )}>
                {q}
              </span>
              {isActive && (
                <div className="ml-auto shrink-0">
                  <ArrowRight className="w-4 h-4 text-[#7c6ff7]" />
                </div>
              )}
            </button>
          );
        })}
      </div>

      <div className="lg:sticky lg:top-28">
        <AnimatePresence mode="wait">
          <motion.div key={active}
            initial={{ opacity: 0, y: 16, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -10, scale: 0.98 }}
            transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
            className="rounded-3xl overflow-hidden border border-gray-100 shadow-[0_8px_48px_rgba(0,0,0,0.07)]">

            <div className="px-8 pt-8 pb-6 border-b border-gray-100 bg-white">
              <div className="flex items-center gap-4 mb-5">
                <div className="w-12 h-12 rounded-2xl bg-[#7c6ff7]/10 flex items-center justify-center text-2xl">
                  {icons[active]}
                </div>
                <div>
                  <span className="text-[10px] font-black text-[#7c6ff7] tracking-widest uppercase">
                    Question {String(active + 1).padStart(2, "0")} of {FAQ.length}
                  </span>
                  <div className="flex items-center gap-1.5 mt-1">
                    {FAQ.map((_, i) => (
                      <div key={i} className="h-1 rounded-full transition-all duration-300"
                        style={{ width: i === active ? 20 : 6, background: i === active ? "#7c6ff7" : "#e5e7eb" }} />
                    ))}
                  </div>
                </div>
              </div>
              <h3 className="text-gray-900 font-black text-xl leading-snug">{FAQ[active].q}</h3>
            </div>

            <div className="px-8 py-7 bg-gray-50/50">
              <p className="text-gray-600 text-base leading-relaxed">{FAQ[active].a}</p>
            </div>

            <div className="px-8 py-5 bg-white border-t border-gray-100 flex items-center justify-between">
              <button onClick={() => setActive(i => Math.max(0, i - 1))}
                disabled={active === 0}
                className="flex items-center gap-2 text-sm font-semibold text-gray-400 hover:text-gray-700 disabled:opacity-20 disabled:cursor-not-allowed transition-colors">
                <ArrowRight className="w-4 h-4 rotate-180" /> Prev
              </button>
              <span className="text-xs text-gray-300 font-mono">{active + 1} / {FAQ.length}</span>
              <button onClick={() => setActive(i => Math.min(FAQ.length - 1, i + 1))}
                disabled={active === FAQ.length - 1}
                className="flex items-center gap-2 text-sm font-semibold text-gray-400 hover:text-gray-700 disabled:opacity-20 disabled:cursor-not-allowed transition-colors">
                Next <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          </motion.div>
        </AnimatePresence>

        <p className="text-center text-gray-400 text-sm mt-5">
          Still unsure?{" "}
          <Link href="/browse" className="text-[#7c6ff7] font-semibold hover:underline underline-offset-2">
            Contact us
          </Link>{" "}
          and we&apos;ll help.
        </p>
      </div>
    </div>
  );
}

/* ══════════════════════════════════════════════
   MEMBERSHIP PLAN STRUCTURE (4 TIERS)
   ══════════════════════════════════════════════ */
const MEMBERSHIP_PLANS = [
  {
    name: "Hobby",
    price: 0,
    commission: 15,
    tagline: "Perfect for testing the platform waters.",
    features: [
      "Keep 85% of order payouts",
      "Up to 3 portfolio item uploads",
      "Standard search listing index",
      "Basic page views analytics dashboard",
      "Standard email support",
    ],
    cta: "Start Free",
    accent: "#64748b",
  },
  {
    name: "Starter",
    price: 499,
    commission: 10,
    tagline: "Level up your freelance presence.",
    features: [
      "Keep 90% of order payouts",
      "Up to 10 portfolio item uploads",
      "Bronze verified platform badge",
      "24-hour priority payouts approval",
      "1 active profile search boost token",
      "Priority email support",
    ],
    cta: "Go Starter",
    accent: "#38bdf8",
  },
  {
    name: "Pro",
    price: 1499,
    commission: 5,
    tagline: "Designed for professional video editors.",
    features: [
      "Keep 95% of order payouts",
      "Unlimited portfolio item uploads",
      "Silver premium verified badge",
      "Instant checkout payouts transfer",
      "Top search placement boost card",
      "3 concurrent active search boosts",
      "24/7 priority discord support",
    ],
    cta: "Go Pro",
    accent: "#7c6ff7",
    isPopular: true,
  },
  {
    name: "Agency",
    price: 3999,
    commission: 3,
    tagline: "Ultimate tier for high-volume studios.",
    features: [
      "Keep 97% of order payouts",
      "Unlimited portfolio item uploads",
      "Gold agency verified badge",
      "Featured Agency listing cards in search",
      "6 concurrent active search boosts",
      "Dedicated success manager seat",
      "Managed invoice matching & client support",
    ],
    cta: "Go Agency",
    accent: "#fbbf24",
  },
];

export function PricingClient({ isPricingTiersEnabled }: { isPricingTiersEnabled: boolean }) {
  return (
    <div className="flex flex-col">

      {/* Hero + Calculator */}
      <section className="relative bg-[#06040f] pt-24 pb-28 px-6 overflow-hidden">
        <div className="absolute inset-0 opacity-[0.035]" style={{ backgroundImage: "radial-gradient(rgba(255,255,255,0.8) 1px,transparent 1px)", backgroundSize: "28px 28px" }} />
        <div className="absolute top-0 left-1/4 w-[500px] h-[500px] rounded-full blur-[140px] opacity-15 pointer-events-none" style={{ background: "#7c6ff7" }} />
        <div className="absolute bottom-0 right-1/4 w-64 h-64 rounded-full blur-[100px] opacity-10 pointer-events-none" style={{ background: "#34d399" }} />

        <div className="relative z-10 px-8 py-6 grid lg:grid-cols-2 gap-16 items-center max-w-7xl mx-auto">
          <div>
            <Reveal>
              <div className="inline-flex items-center gap-2 border border-[#7c6ff7]/30 bg-[#7c6ff7]/10 text-[#7c6ff7] text-[11px] font-black tracking-[0.22em] uppercase px-4 py-2 rounded-full mb-8">
                Pricing
              </div>
            </Reveal>
            <Reveal delay={0.05}>
              <h1 className="text-5xl sm:text-6xl font-black text-white tracking-tight leading-[0.92] mb-6">
                One fee.<br />
                <span className="text-transparent bg-clip-text" style={{ backgroundImage: "linear-gradient(135deg,#7c6ff7 30%,#34d399)" }}>
                  No surprises.
                </span>
              </h1>
            </Reveal>
            <Reveal delay={0.1}>
              <p className="text-white/35 text-lg leading-relaxed mb-10 max-w-md">
                Clients pay a small 4% processing fee. Editors keep 85% of every order on our Free plan. No hidden charges.
              </p>
            </Reveal>

            <Reveal delay={0.15}>
              <div className="flex flex-wrap gap-3">
                {[
                  { label: "4%", sub: "client fee" },
                  { label: "85%", sub: "editor keeps" },
                  { label: "₹0", sub: "monthly fee" },
                  { label: "7 days", sub: "auto-approval" },
                ].map(({ label, sub }) => (
                  <div key={sub} className="border border-white/[0.08] rounded-2xl px-4 py-3 text-center" style={{ background: "rgba(255,255,255,0.03)" }}>
                    <p className="text-white font-black text-lg leading-none">{label}</p>
                    <p className="text-white/30 text-[10px] mt-1 font-medium">{sub}</p>
                  </div>
                ))}
              </div>
            </Reveal>
          </div>

          <Reveal delay={0.2}>
            <Calculator />
          </Reveal>
        </div>
      </section>

      {/* Editor Membership Tiers (4 Columns) - Controlled by Feature Flag */}
      {isPricingTiersEnabled && (
        <section className="py-24 px-6 bg-gradient-to-b from-gray-50 to-white overflow-hidden border-b border-gray-100">
          <div className="max-w-7xl mx-auto px-4">
            <Reveal className="text-center mb-16">
              <div className="flex items-center justify-center gap-3 mb-5">
                <div className="h-px w-8 bg-indigo-200" />
                <span className="text-[10px] font-black text-indigo-600 uppercase tracking-[0.28em]">Premium Memberships</span>
                <div className="h-px w-8 bg-indigo-200" />
              </div>
              <h2 className="text-4xl sm:text-5xl font-black text-gray-900 tracking-tight leading-none mb-4">
                Editor Membership Plans.
              </h2>
              <p className="text-sm text-gray-500 max-w-xl mx-auto mt-2 leading-relaxed">
                Scale your video editing business on EditBridge. Lower commissions, get priority payouts, and unlock premium badges to standout.
              </p>
            </Reveal>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 items-stretch">
              {MEMBERSHIP_PLANS.map((plan, i) => (
                <Reveal key={plan.name} delay={i * 0.08}>
                  <div
                    className={cn(
                      "relative rounded-3xl p-6 h-full flex flex-col transition-all duration-350 border bg-white",
                      plan.isPopular
                        ? "border-indigo-500 ring-4 ring-indigo-500/10 shadow-[0_20px_50px_rgba(124,111,247,0.12)] scale-[1.03] lg:scale-[1.04]"
                        : "border-gray-200 hover:border-gray-300 hover:shadow-md shadow-sm"
                    )}
                  >
                    {plan.isPopular && (
                      <span className="absolute -top-3.5 left-1/2 -translate-x-1/2 bg-indigo-600 text-white text-[9px] font-black uppercase tracking-widest px-3 py-1 rounded-full shadow-sm">
                        Most Popular
                      </span>
                    )}

                    <div className="mb-4">
                      <span
                        className="text-[10px] font-extrabold uppercase tracking-widest px-2.5 py-1 rounded-full"
                        style={{ color: plan.accent, background: `${plan.accent}15` }}
                      >
                        {plan.name}
                      </span>
                      <div className="mt-5 flex items-baseline gap-1">
                        <span className="text-4xl font-black text-gray-900 leading-none">₹{plan.price.toLocaleString("en-IN")}</span>
                        <span className="text-xs text-gray-400 font-semibold">/mo</span>
                      </div>
                      <p className="text-xs text-gray-400 leading-relaxed font-medium mt-2">{plan.tagline}</p>
                    </div>

                    <div className="border-t border-gray-100 my-4" />

                    <div className="mb-5 py-2.5 px-3 rounded-2xl bg-gray-50 border border-gray-100 flex items-center justify-between">
                      <span className="text-[10px] font-bold text-gray-400 uppercase">Commission</span>
                      <span className="text-xs font-black text-gray-800 bg-white border border-gray-150 px-2 py-0.5 rounded-lg shadow-sm">
                        {plan.commission}% platform cut
                      </span>
                    </div>

                    <div className="space-y-3 flex-1 mb-8">
                      {plan.features.map((feat) => (
                        <div key={feat} className="flex items-start gap-2 text-xs">
                          <CheckCircle className="w-4 h-4 text-emerald-500 shrink-0 mt-0.5" />
                          <span className="text-gray-600 leading-normal font-medium">{feat}</span>
                        </div>
                      ))}
                    </div>

                    <Link
                      href="/login?callbackUrl=/editor/settings"
                      className={cn(
                        "w-full text-center py-3 rounded-2xl text-xs font-bold transition-all shadow-sm block mt-auto",
                        plan.isPopular
                          ? "bg-indigo-600 hover:bg-indigo-700 text-white hover:shadow-indigo-600/10"
                          : "bg-gray-900 hover:bg-gray-800 text-white"
                      )}
                    >
                      {plan.cta}
                    </Link>
                  </div>
                </Reveal>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* What You Get */}
      <section className="py-24 px-6 bg-white border-b border-gray-100">
        <div className="max-w-7xl mx-auto px-4">
          <Reveal className="mb-16">
            <div className="flex items-center gap-3 mb-5">
              <div className="h-px w-8 bg-gray-200" />
              <span className="text-[10px] font-black text-gray-400 uppercase tracking-[0.28em]">What you get</span>
            </div>
            <h2 className="text-4xl sm:text-5xl font-black text-gray-900 tracking-tight">
              Every order includes.
            </h2>
          </Reveal>

          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {[
              { icon: Lock,        accent: "#7c6ff7", title: "Verified payment protection", desc: "Your money is held securely and only released to the editor when you approve the delivery." },
              { icon: ShieldCheck, accent: "#34d399", title: "KYC-verified editors",        desc: "Every editor submits a government ID before they can take a single order on EditBridge." },
              { icon: CheckCircle, accent: "#fbbf24", title: "Revisions included",          desc: "Every package includes a set number of revision rounds. No surprise charges for changes." },
              { icon: Zap,         accent: "#38bdf8", title: "Real-time chat",              desc: "Brief your editor, share files, and track progress — all in one place inside the platform." },
              { icon: IndianRupee, accent: "#f472b6", title: "Transparent payouts",         desc: "Editors get paid via UPI or bank transfer. No delay, no minimum balance, no hidden cuts." },
              { icon: ArrowRight,  accent: "#a3e635", title: "Dispute resolution",          desc: "If anything goes wrong, our team reviews the case and mediates a fair outcome for both sides." },
            ].map(({ icon: Icon, accent, title, desc }, i) => (
              <Reveal key={title} delay={i * 0.07}>
                <div className="rounded-2xl border border-gray-100 bg-white p-6 h-full transition-all hover:border-gray-200 hover:shadow-lg">
                  <div className="w-10 h-10 rounded-xl flex items-center justify-center mb-5" style={{ background: `${accent}15` }}>
                    <Icon className="w-5 h-5" style={{ color: accent }} />
                  </div>
                  <h3 className="font-bold text-gray-900 text-sm mb-2">{title}</h3>
                  <p className="text-gray-400 text-sm leading-relaxed">{desc}</p>
                </div>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* Side-by-Side Cards */}
      <section className="py-24 px-6 bg-gray-50 border-b border-gray-100">
        <div className="max-w-7xl mx-auto px-4">
          <Reveal className="text-center mb-16">
            <div className="flex items-center justify-center gap-3 mb-5">
              <div className="h-px w-8 bg-gray-200" />
              <span className="text-[10px] font-black text-gray-400 uppercase tracking-[0.28em]">Two sides</span>
              <div className="h-px w-8 bg-gray-200" />
            </div>
            <h2 className="text-4xl sm:text-5xl font-black text-gray-900 tracking-tight">
              Your pricing, at a glance.
            </h2>
          </Reveal>

          <div className="grid sm:grid-cols-2 gap-6">
            <Reveal delay={0.05}>
              <div className="rounded-3xl bg-white border border-gray-100 overflow-hidden h-full shadow-[0_4px_24px_rgba(0,0,0,0.04)]">
                <div className="h-1.5 w-full" style={{ background: "linear-gradient(90deg,#34d399,#059669)" }} />
                <div className="p-8">
                  <span className="text-[10px] font-black text-emerald-700 bg-emerald-50 border border-emerald-100 px-3 py-1 rounded-full tracking-widest uppercase">For Clients</span>
                  <div className="mt-7 mb-2 flex items-end gap-1">
                    <span className="text-8xl font-black text-gray-900 leading-none tracking-tight">4</span>
                    <span className="text-4xl font-black text-gray-900 mb-2">%</span>
                  </div>
                  <p className="text-gray-400 text-sm mb-8">processing fee · charged once at checkout</p>

                  <div className="space-y-3 mb-10">
                    {[
                      "4% of package price only",
                      "Verified payment protection included",
                      "Revisions included per package",
                      "Dispute resolution if needed",
                      "No other charges",
                    ].map(item => (
                      <div key={item} className="flex items-center gap-3">
                        <div className="w-5 h-5 rounded-full bg-emerald-100 flex items-center justify-center shrink-0">
                          <CheckCircle className="w-3 h-3 text-emerald-600" />
                        </div>
                        <span className="text-gray-600 text-sm">{item}</span>
                      </div>
                    ))}
                  </div>

                  <Link href="/browse"
                    className="inline-flex items-center gap-2 w-full justify-center bg-[#059669] hover:bg-[#047857] text-white font-bold px-6 py-3.5 rounded-2xl text-sm transition-all shadow-[0_6px_20px_rgba(5,150,105,0.25)]">
                    Browse editors <ArrowRight className="w-4 h-4" />
                  </Link>
                </div>
              </div>
            </Reveal>

            <Reveal delay={0.1}>
              <div className="rounded-3xl overflow-hidden h-full shadow-[0_16px_64px_rgba(74,63,181,0.25)]"
                style={{ background: "linear-gradient(155deg,#2d2480 0%,#0EA5E9 45%,#7c6ff7 100%)" }}>
                <div className="p-8 h-full flex flex-col">
                  <span className="text-[10px] font-black text-white/50 bg-white/10 border border-white/10 px-3 py-1 rounded-full tracking-widest uppercase w-fit">For Editors</span>

                  <div className="mt-7 mb-2 flex items-end gap-1">
                    <span className="text-8xl font-black text-white leading-none tracking-tight">85</span>
                    <span className="text-4xl font-black text-white mb-2">%</span>
                  </div>
                  <p className="text-white/40 text-sm mb-8">you keep · commission only on completion</p>

                  <div className="space-y-3 mb-10">
                    {[
                      "Commission deducted only on delivery",
                      "No subscription or listing fee",
                      "Free profile & packages",
                      "UPI & bank transfer payouts",
                      "Reliable payment — always on time",
                    ].map(item => (
                      <div key={item} className="flex items-center gap-3">
                        <div className="w-5 h-5 rounded-full bg-white/15 flex items-center justify-center shrink-0">
                          <CheckCircle className="w-3 h-3 text-white/70" />
                        </div>
                        <span className="text-white/75 text-sm">{item}</span>
                      </div>
                    ))}
                  </div>

                  <Link href="/signup/editor"
                    className="inline-flex items-center gap-2 w-full justify-center bg-white hover:bg-white/90 text-[var(--brand-client)] font-bold px-6 py-3.5 rounded-2xl text-sm transition-all mt-auto shadow-[0_6px_20px_rgba(0,0,0,0.15)]">
                    Apply as editor <ArrowRight className="w-4 h-4" />
                  </Link>
                </div>
              </div>
            </Reveal>
          </div>
        </div>
      </section>

      {/* FAQ */}
      <section className="py-24 px-6 bg-white overflow-hidden border-b border-gray-100">
        <div className="max-w-7xl mx-auto px-4">
          <Reveal className="mb-16">
            <div className="flex items-center gap-3 mb-5">
              <div className="h-px w-8 bg-gray-200" />
              <span className="text-[10px] font-black text-gray-400 uppercase tracking-[0.28em]">FAQ</span>
            </div>
            <h2 className="text-4xl sm:text-5xl font-black text-gray-900 tracking-tight">Pricing questions</h2>
          </Reveal>

          <PricingFAQ />
        </div>
      </section>

      {/* CTA */}
      <section className="relative bg-[#06040f] py-28 px-6 overflow-hidden">
        <div className="absolute inset-0 opacity-[0.035]" style={{ backgroundImage: "radial-gradient(rgba(255,255,255,0.8) 1px,transparent 1px)", backgroundSize: "28px 28px" }} />
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_70%_60%_at_50%_50%,rgba(124,111,247,0.18),transparent)]" />
        <div className="relative z-10 px-8 py-6 text-center max-w-4xl mx-auto">
          <Reveal>
            <h2 className="text-4xl sm:text-6xl font-black text-white tracking-tight leading-[0.95] mb-6">
              Start with<br />
              <span className="text-transparent bg-clip-text" style={{ backgroundImage: "linear-gradient(135deg,#7c6ff7,#34d399)" }}>
                zero risk.
              </span>
            </h2>
            <p className="text-white/35 text-lg mb-12 leading-relaxed px-8 py-6">
              Your payment is held securely and only released when you approve. If you don&apos;t love the result, you&apos;re protected.
            </p>
            <div className="flex items-center justify-center gap-4 flex-wrap">
              <Link href="/browse"
                className="inline-flex items-center gap-2 bg-[#7c6ff7] hover:bg-[#6a5ef0] text-white font-bold px-8 py-4 rounded-2xl text-sm transition-all shadow-[0_8px_32px_rgba(124,111,247,0.45)]">
                Browse editors <ArrowRight className="w-4 h-4" />
              </Link>
              <Link href="/signup/editor"
                className="inline-flex items-center gap-2 border border-white/10 text-white/50 hover:text-white hover:border-white/20 font-medium px-8 py-4 rounded-2xl text-sm transition-all">
                Join as editor
              </Link>
            </div>
          </Reveal>
        </div>
      </section>

    </div>
  );
}
