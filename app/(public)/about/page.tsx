"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import { ShieldCheck, IndianRupee, Zap, MessageSquare, ArrowRight, CheckCircle, Users, Star } from "lucide-react";

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
   DATA
══════════════════════════════════════════════ */
const VALUES = [
  {
    icon: ShieldCheck, accent: "#7c6ff7",
    title: "Trust first",
    desc: "Every editor is KYC-verified with a government ID. Every payment is held securely. Safety is not a feature — it's the foundation.",
  },
  {
    icon: IndianRupee, accent: "#34d399",
    title: "Editors earn fairly",
    desc: "85% of every completed order goes to the editor. We believe creative work deserves real, reliable compensation.",
  },
  {
    icon: Zap, accent: "#fbbf24",
    title: "No bloat",
    desc: "Browse, pay, collaborate, approve — four steps. We resist adding complexity that doesn't directly help creators.",
  },
  {
    icon: MessageSquare, accent: "#38bdf8",
    title: "Platform-first communication",
    desc: "All client-editor communication stays on EditBridge. This protects both parties and keeps a clear, accountable record.",
  },
];


const PROBLEMS = [
  { problem: "Clients couldn't trust strangers with their brand",        fix: "KYC-verified editor profiles with reviews"              },
  { problem: "Editors couldn't trust clients to pay on time",            fix: "Payment held before work begins, released on approval"  },
  { problem: "Platforms took 30–40% cuts",                               fix: "Flat 15% commission, editors keep 85%"                  },
  { problem: "Communication moved off-platform, no accountability",      fix: "All messages & files stay on EditBridge"               },
];

/* ══════════════════════════════════════════════
   PAGE
══════════════════════════════════════════════ */
export default function AboutPage() {

  return (
    <div className="flex flex-col">

      {/* ══ HERO ══ */}
      <section className="relative bg-[#06040f] pt-28 pb-32 px-6 overflow-hidden">
        <div className="absolute inset-0 opacity-[0.035]" style={{ backgroundImage: "radial-gradient(rgba(255,255,255,0.8) 1px,transparent 1px)", backgroundSize: "28px 28px" }} />
        <div className="absolute top-0 left-1/4 w-[500px] h-[500px] rounded-full blur-[140px] opacity-15 pointer-events-none" style={{ background: "#7c6ff7" }} />
        <div className="absolute bottom-0 right-1/3 w-72 h-72 rounded-full blur-[120px] opacity-10 pointer-events-none" style={{ background: "#34d399" }} />

        <div className="relative z-10 px-8 py-6">
          <Reveal>
            <div className="inline-flex items-center gap-2 border border-[#7c6ff7]/30 bg-[#7c6ff7]/10 text-[#7c6ff7] text-[11px] font-black tracking-[0.2em] uppercase px-4 py-2 rounded-full mb-10">
              About EditBridge
            </div>
          </Reveal>

          <Reveal delay={0.06}>
            <h1 className="text-5xl sm:text-7xl lg:text-8xl font-black text-white tracking-tight leading-[0.9] mb-8">
              Built for the<br />
              <span className="text-transparent bg-clip-text" style={{ backgroundImage: "linear-gradient(135deg,#7c6ff7 20%,#34d399 80%)" }}>
                Indian creator<br />economy.
              </span>
            </h1>
          </Reveal>

          <Reveal delay={0.12}>
            <p className="text-white/35 text-xl max-w-2xl leading-relaxed mb-14">
              We&apos;re on a mission to make creative freelancing safe, fair, and worth it — for editors and clients alike.
            </p>
          </Reveal>

          {/* Stat row */}
          <Reveal delay={0.18}>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              {[
                { n: "2026", label: "Founded" },
                { n: "India", label: "Based in" },
                { n: "5+",   label: "Creative niches" },
                { n: "85%",  label: "Editor keeps" },
              ].map(({ n, label }) => (
                <div key={label} className="rounded-2xl border border-white/[0.07] px-5 py-4" style={{ background: "rgba(255,255,255,0.03)" }}>
                  <p className="text-white font-black text-2xl leading-none">{n}</p>
                  <p className="text-white/30 text-xs mt-1.5 font-medium">{label}</p>
                </div>
              ))}
            </div>
          </Reveal>
        </div>
      </section>

      {/* ══ THE PROBLEM WE SOLVED ══ */}
      <section className="py-28 px-6 bg-white">
        <div className="px-8 py-6">
          <div className="grid lg:grid-cols-2 gap-20 items-start">

            {/* Left: story */}
            <div>
              <Reveal>
                <div className="flex items-center gap-3 mb-6">
                  <div className="h-px w-8 bg-[#7c6ff7]" />
                  <span className="text-[10px] font-black text-[#7c6ff7] uppercase tracking-[0.28em]">Our story</span>
                </div>
                <h2 className="text-4xl sm:text-5xl font-black text-gray-900 tracking-tight leading-[1.05] mb-8">
                  Freelancing for<br />
                  creative work<br />
                  <span className="text-gray-200">was broken.</span>
                </h2>
              </Reveal>

              <div className="space-y-5">
                {[
                  "EditBridge was born from a simple frustration: hiring a video editor felt like a gamble. Would they deliver? Would they disappear with the brief? Would the quality match the promise?",
                  "On the other side, editors were getting underpaid, ghosted after delivery, or working for platforms that took 30–40% of every order.",
                  "We built EditBridge to fix both sides. Government ID verification for every editor. Payment held securely until the client approves. A flat 15% commission — only charged when work is actually delivered.",
                ].map((p, i) => (
                  <Reveal key={i} delay={i * 0.08}>
                    <p className="text-gray-500 text-base leading-relaxed">{p}</p>
                  </Reveal>
                ))}
              </div>
            </div>

            {/* Right: problem→fix table */}
            <Reveal delay={0.1}>
              <div className="space-y-3">
                <p className="text-[10px] font-black text-gray-400 uppercase tracking-[0.28em] mb-5">What we fixed</p>
                {PROBLEMS.map(({ problem, fix }, i) => (
                  <motion.div key={i} initial={{ opacity: 0, x: 20 }} whileInView={{ opacity: 1, x: 0 }}
                    viewport={{ once: true }} transition={{ delay: i * 0.08, duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
                    className="rounded-2xl border border-gray-100 overflow-hidden">
                    <div className="px-5 py-3 bg-red-50/60 flex items-start gap-3">
                      <span className="text-red-400 mt-0.5 shrink-0">✕</span>
                      <p className="text-red-600/80 text-sm">{problem}</p>
                    </div>
                    <div className="px-5 py-3 bg-emerald-50/60 flex items-start gap-3">
                      <CheckCircle className="w-4 h-4 text-emerald-500 mt-0.5 shrink-0" />
                      <p className="text-emerald-700 text-sm font-medium">{fix}</p>
                    </div>
                  </motion.div>
                ))}
              </div>
            </Reveal>
          </div>
        </div>
      </section>

      {/* ══ WHY WE BUILT THIS ══ */}
      <section className="py-28 px-6 bg-gray-50 overflow-hidden">
        <div className="px-8 py-6">
          <Reveal className="mb-16">
            <div className="flex items-center gap-3 mb-6">
              <div className="h-px w-8 bg-gray-300" />
              <span className="text-[10px] font-black text-gray-400 uppercase tracking-[0.28em]">Why we built this</span>
            </div>
            <h2 className="text-4xl sm:text-5xl font-black text-gray-900 tracking-tight leading-tight">
              Three frustrations.<br />
              <span className="text-gray-200">One platform.</span>
            </h2>
          </Reveal>

          <div className="grid sm:grid-cols-3 gap-5">
            {[
              {
                n: "01",
                accent: "#7c6ff7",
                title: "No one trusted anyone",
                body: "Clients feared editors would take the brief and disappear. Editors feared clients would reject work and refuse to pay. There was no neutral ground.",
                fix: "KYC-verified profiles + payment held before work starts",
              },
              {
                n: "02",
                accent: "#34d399",
                title: "Platforms took too much",
                body: "Most freelance platforms charge editors 20–40% per order. After taxes and time, editors barely broke even. That's not fair compensation for skilled work.",
                fix: "Flat 15% commission — editors keep 85%, always",
              },
              {
                n: "03",
                accent: "#fbbf24",
                title: "No accountability",
                body: "Communication moved to WhatsApp. Deliverables were sent over email. When things went wrong, there was no record, no recourse, no way to resolve disputes fairly.",
                fix: "All messages, files, and orders stay on EditBridge",
              },
            ].map(({ n, accent, title, body, fix }, i) => (
              <Reveal key={n} delay={i * 0.1}>
                <motion.div whileHover={{ y: -5, boxShadow: `0 20px 60px ${accent}12` }}
                  transition={{ type: "spring", stiffness: 260 }}
                  className="bg-white rounded-3xl border border-gray-100 p-7 h-full flex flex-col transition-all hover:border-gray-200">
                  <div className="flex items-center justify-between mb-6">
                    <span className="text-4xl font-black" style={{ color: `${accent}30` }}>{n}</span>
                    <div className="w-2 h-2 rounded-full" style={{ background: accent }} />
                  </div>
                  <h3 className="text-gray-900 font-black text-lg mb-3 leading-snug">{title}</h3>
                  <p className="text-gray-400 text-sm leading-relaxed flex-1 mb-6">{body}</p>
                  <div className="flex items-start gap-2.5 rounded-xl px-4 py-3 border" style={{ background: `${accent}08`, borderColor: `${accent}20` }}>
                    <CheckCircle className="w-4 h-4 shrink-0 mt-0.5" style={{ color: accent }} />
                    <p className="text-sm font-semibold" style={{ color: accent }}>{fix}</p>
                  </div>
                </motion.div>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* ══ VALUES ══ */}
      <section className="py-28 px-6 bg-white">
        <div className="px-8 py-6">
          <Reveal className="mb-16">
            <div className="flex items-center gap-3 mb-6">
              <div className="h-px w-8 bg-[#7c6ff7]" />
              <span className="text-[10px] font-black text-[#7c6ff7] uppercase tracking-[0.28em]">What we stand for</span>
            </div>
            <h2 className="text-4xl sm:text-5xl font-black text-gray-900 tracking-tight">
              Our values.
            </h2>
          </Reveal>

          <div className="grid sm:grid-cols-2 gap-5">
            {VALUES.map(({ icon: Icon, accent, title, desc }, i) => (
              <Reveal key={title} delay={i * 0.08}>
                <motion.div whileHover={{ y: -5, boxShadow: `0 20px 60px ${accent}14` }}
                  transition={{ type: "spring", stiffness: 260 }}
                  className="rounded-3xl border border-gray-100 bg-white p-7 h-full transition-all hover:border-gray-200 group overflow-hidden relative">
                  {/* Accent blob */}
                  <div className="absolute -top-8 -right-8 w-24 h-24 rounded-full blur-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none"
                    style={{ background: accent }} />

                  <div className="relative">
                    <div className="w-12 h-12 rounded-2xl flex items-center justify-center mb-6 transition-all group-hover:scale-110"
                      style={{ background: `${accent}15` }}>
                      <Icon className="w-6 h-6" style={{ color: accent }} />
                    </div>
                    <h3 className="text-gray-900 font-black text-xl mb-3">{title}</h3>
                    <p className="text-gray-400 text-sm leading-relaxed">{desc}</p>
                  </div>
                </motion.div>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* ══ WHO WE'RE BUILT FOR ══ */}
      <section className="py-28 px-6 bg-[#06040f] overflow-hidden relative">
        <div className="absolute inset-0 opacity-[0.035]" style={{ backgroundImage: "radial-gradient(rgba(255,255,255,0.8) 1px,transparent 1px)", backgroundSize: "28px 28px" }} />
        <div className="absolute top-0 right-1/4 w-80 h-80 rounded-full blur-[120px] opacity-15 pointer-events-none" style={{ background: "#7c6ff7" }} />

        <div className="relative z-10 px-8 py-6">
          <Reveal className="mb-16">
            <div className="flex items-center gap-3 mb-6">
              <div className="h-px w-8 bg-[#7c6ff7]" />
              <span className="text-[10px] font-black text-[#7c6ff7] uppercase tracking-[0.28em]">Who we serve</span>
            </div>
            <h2 className="text-4xl sm:text-5xl font-black text-white tracking-tight">
              Built for two sides<br />
              <span className="text-white/15">of the same mission.</span>
            </h2>
          </Reveal>

          <div className="grid sm:grid-cols-2 gap-6">
            {/* Clients */}
            <Reveal delay={0.05}>
              <div className="rounded-3xl p-8 border border-white/[0.07] h-full" style={{ background: "rgba(255,255,255,0.03)" }}>
                <div className="w-12 h-12 rounded-2xl bg-[#34d399]/15 flex items-center justify-center mb-7">
                  <Users className="w-6 h-6 text-[#34d399]" />
                </div>
                <h3 className="text-white font-black text-2xl mb-3">Creators & brands</h3>
                <p className="text-white/40 text-sm leading-relaxed mb-7">
                  YouTube channels, social media teams, D2C brands, agencies — anyone who needs consistent, high-quality video editing without the risk of working with strangers online.
                </p>
                <ul className="space-y-2.5 mb-8">
                  {["KYC-verified editors only", "Payment held until you approve", "Revisions included in every package", "Real-time collaboration on platform"].map(f => (
                    <li key={f} className="flex items-center gap-3 text-sm text-white/60">
                      <CheckCircle className="w-4 h-4 text-[#34d399] shrink-0" />{f}
                    </li>
                  ))}
                </ul>
                <Link href="/browse" className="inline-flex items-center gap-2 bg-[#34d399] hover:bg-[#2dd48a] text-[#06040f] font-bold px-5 py-3 rounded-xl text-sm transition-all">
                  Find an editor <ArrowRight className="w-4 h-4" />
                </Link>
              </div>
            </Reveal>

            {/* Editors */}
            <Reveal delay={0.1}>
              <div className="rounded-3xl p-8 border border-white/[0.07] h-full" style={{ background: "rgba(255,255,255,0.03)" }}>
                <div className="w-12 h-12 rounded-2xl bg-[#7c6ff7]/20 flex items-center justify-center mb-7">
                  <Star className="w-6 h-6 text-[#7c6ff7]" />
                </div>
                <h3 className="text-white font-black text-2xl mb-3">Freelance editors</h3>
                <p className="text-white/40 text-sm leading-relaxed mb-7">
                  Video editors, thumbnail designers, motion graphics artists, and podcast editors who want a reliable platform to find clients, get paid on time, and build a sustainable career.
                </p>
                <ul className="space-y-2.5 mb-8">
                  {["Keep 85% of every order", "No monthly fees or listing costs", "Payment guaranteed before you start", "Build a verified, trustworthy profile"].map(f => (
                    <li key={f} className="flex items-center gap-3 text-sm text-white/60">
                      <CheckCircle className="w-4 h-4 text-[#7c6ff7] shrink-0" />{f}
                    </li>
                  ))}
                </ul>
                <Link href="/signup/editor" className="inline-flex items-center gap-2 bg-[#7c6ff7] hover:bg-[#6a5ef0] text-white font-bold px-5 py-3 rounded-xl text-sm transition-all shadow-[0_6px_20px_rgba(124,111,247,0.35)]">
                  Apply as editor <ArrowRight className="w-4 h-4" />
                </Link>
              </div>
            </Reveal>
          </div>
        </div>
      </section>

      {/* ══ CTA ══ */}
      <section className="py-28 px-6 bg-white">
        <div className="px-8 py-6">
          <Reveal>
            <div className="rounded-3xl overflow-hidden relative" style={{ background: "linear-gradient(145deg,#06040f 0%,#1a1040 60%,#0a1f1a 100%)" }}>
              <div className="absolute inset-0 opacity-[0.04]" style={{ backgroundImage: "radial-gradient(rgba(255,255,255,0.8) 1px,transparent 1px)", backgroundSize: "24px 24px" }} />
              <div className="absolute top-0 right-0 w-64 h-64 rounded-full blur-[80px] opacity-20 pointer-events-none" style={{ background: "#7c6ff7" }} />
              <div className="absolute bottom-0 left-0 w-48 h-48 rounded-full blur-[80px] opacity-15 pointer-events-none" style={{ background: "#34d399" }} />

              <div className="relative z-10 p-12 sm:p-16 text-center">
                <div className="inline-flex items-center gap-2 border border-white/10 bg-white/5 text-white/50 text-[10px] font-black tracking-[0.2em] uppercase px-4 py-2 rounded-full mb-8">
                  Join EditBridge
                </div>
                <h2 className="text-4xl sm:text-5xl font-black text-white tracking-tight leading-[0.95] mb-5">
                  Whether you create<br />
                  <span className="text-transparent bg-clip-text" style={{ backgroundImage: "linear-gradient(135deg,#7c6ff7,#34d399)" }}>
                    or edit content —
                  </span>
                </h2>
                <p className="text-white/35 text-lg mb-12 px-8 py-6 leading-relaxed">
                  we built EditBridge for you. Safe payments, verified editors, fair earnings.
                </p>
                <div className="flex flex-col sm:flex-row gap-4 justify-center">
                  <Link href="/browse"
                    className="inline-flex items-center justify-center gap-2 bg-[#7c6ff7] hover:bg-[#6a5ef0] text-white font-bold px-8 py-4 rounded-2xl text-sm transition-all shadow-[0_8px_32px_rgba(124,111,247,0.45)]">
                    Find an editor <ArrowRight className="w-4 h-4" />
                  </Link>
                  <Link href="/signup/editor"
                    className="inline-flex items-center justify-center gap-2 border border-white/10 text-white/60 hover:text-white hover:border-white/20 font-medium px-8 py-4 rounded-2xl text-sm transition-all">
                    Apply as editor
                  </Link>
                </div>
              </div>
            </div>
          </Reveal>
        </div>
      </section>

    </div>
  );
}