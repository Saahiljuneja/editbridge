"use client";

import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import {
  Mail, MessageSquare, Clock, Shield, ArrowRight,
  HelpCircle, ChevronDown, CheckCircle, Zap,
  FileText, Search, Users,
} from "lucide-react";
import { useState } from "react";
import { cn } from "@/lib/utils";

/* ══════════════════════════════════════════════
   HELPERS
══════════════════════════════════════════════ */
function Reveal({ children, delay = 0, className = "" }: { children: React.ReactNode; delay?: number; className?: string }) {
  return (
    <motion.div initial={{ opacity: 0, y: 24 }} whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-50px" }}
      transition={{ duration: 0.7, delay, ease: [0.22, 1, 0.36, 1] }}
      className={className}>
      {children}
    </motion.div>
  );
}

/* ══════════════════════════════════════════════
   DATA
══════════════════════════════════════════════ */
const CHANNELS = [
  {
    icon: Mail,     accent: "#7c6ff7",
    label: "General support",
    value: "support@editbridge.in",
    desc: "Account issues, billing, general queries",
    href: "mailto:support@editbridge.in",
    response: "< 15 hrs",
  },
  {
    icon: Shield,   accent: "#34d399",
    label: "KYC & verification",
    value: "kyc@editbridge.in",
    desc: "Document verification, rejection appeals",
    href: "mailto:kyc@editbridge.in",
    response: "1–2 days",
  },
  {
    icon: MessageSquare, accent: "#fbbf24",
    label: "Partnerships",
    value: "partnerships@editbridge.in",
    desc: "Business collaborations & integrations",
    href: "mailto:partnerships@editbridge.in",
    response: "2–3 days",
  },
];

const SELF_SERVICE = [
  { icon: FileText, accent: "#7c6ff7", label: "Open a dispute",       sub: "Fastest path for order issues",          href: "/orders"              },
  { icon: HelpCircle, accent: "#34d399", label: "Browse the FAQ",     sub: "Answers to 18+ common questions",        href: "/faq"                 },
  { icon: Search,   accent: "#38bdf8", label: "Check KYC status",     sub: "View your verification status",          href: "/editor/kyc/pending"  },
  { icon: Users,    accent: "#fbbf24", label: "Browse editors",        sub: "Find verified video editors",            href: "/browse"              },
];

const FAQS = [
  { q: "How long does it take to get a response?",              a: "We typically respond within 15 business hours. For urgent issues, mention it in your subject line." },
  { q: "I have an issue with my order. Who should I contact?",  a: "Use the dispute system inside your order page first — it's the fastest path to resolution. Our team is notified immediately." },
  { q: "My KYC was rejected. What should I do?",               a: "Check the rejection reason in your KYC dashboard, correct the issue, and resubmit. Still stuck? Email kyc@editbridge.in." },
  { q: "How do I delete my account?",                           a: "Email support@editbridge.in with your registered email and we'll process the deletion within 3 business days." },
];

/* ══════════════════════════════════════════════
   COMPONENTS
══════════════════════════════════════════════ */
function FAQItem({ q, a, i }: { q: string; a: string; i: number }) {
  const [open, setOpen] = useState(false);
  return (
    <Reveal delay={i * 0.06}>
      <button onClick={() => setOpen(o => !o)} className="w-full text-left">
        <div className={cn("rounded-2xl border transition-all overflow-hidden",
          open ? "border-[#7c6ff7]/25 bg-[#7c6ff7]/[0.02]" : "border-gray-100 bg-white hover:border-gray-200")}>
          <div className="flex items-center gap-4 px-6 py-5">
            <motion.div animate={{ background: open ? "#7c6ff7" : "#f3f4f6", rotate: open ? 45 : 0 }}
              transition={{ duration: 0.2 }}
              className="w-6 h-6 rounded-lg flex items-center justify-center shrink-0">
              <span className={cn("text-sm font-black leading-none", open ? "text-white" : "text-gray-400")}>+</span>
            </motion.div>
            <span className="text-gray-900 font-semibold text-sm flex-1 text-left leading-snug">{q}</span>
            <motion.div animate={{ rotate: open ? 180 : 0 }} transition={{ duration: 0.2 }} className="shrink-0">
              <ChevronDown className="w-4 h-4 text-gray-300" />
            </motion.div>
          </div>
          <AnimatePresence initial={false}>
            {open && (
              <motion.div initial={{ height: 0 }} animate={{ height: "auto" }} exit={{ height: 0 }}
                transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }} className="overflow-hidden">
                <p className="px-6 pb-5 pl-16 text-gray-500 text-sm leading-relaxed">{a}</p>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </button>
    </Reveal>
  );
}

/* ══════════════════════════════════════════════
   PAGE
══════════════════════════════════════════════ */
export default function ContactPage() {
  const [copied, setCopied] = useState<string | null>(null);

  function copy(val: string) {
    navigator.clipboard.writeText(val);
    setCopied(val);
    setTimeout(() => setCopied(null), 2000);
  }

  return (
    <div className="flex flex-col bg-white">

      {/* ══ HERO ══ */}
      <section className="relative bg-[#06040f] pt-24 pb-28 px-6 overflow-hidden">
        <div className="absolute inset-0 opacity-[0.035]" style={{ backgroundImage: "radial-gradient(rgba(255,255,255,0.8) 1px,transparent 1px)", backgroundSize: "28px 28px" }} />
        <div className="absolute top-0 left-1/3 w-[500px] h-[500px] rounded-full blur-[140px] opacity-15 pointer-events-none" style={{ background: "#7c6ff7" }} />
        <div className="absolute bottom-0 right-1/4 w-64 h-64 rounded-full blur-[100px] opacity-10 pointer-events-none" style={{ background: "#34d399" }} />

        <div className="relative z-10 px-8 py-6 grid lg:grid-cols-2 gap-16 items-center">

          {/* Left */}
          <div>
            <Reveal>
              <div className="inline-flex items-center gap-2 border border-[#7c6ff7]/30 bg-[#7c6ff7]/10 text-[#7c6ff7] text-[11px] font-black tracking-[0.2em] uppercase px-4 py-2 rounded-full mb-8">
                Contact us
              </div>
            </Reveal>
            <Reveal delay={0.06}>
              <h1 className="text-5xl sm:text-6xl font-black text-white tracking-tight leading-[0.92] mb-6">
                We&apos;re here<br />
                <span className="text-transparent bg-clip-text" style={{ backgroundImage: "linear-gradient(135deg,#7c6ff7,#34d399)" }}>
                  to help.
                </span>
              </h1>
            </Reveal>
            <Reveal delay={0.1}>
              <p className="text-white/35 text-lg leading-relaxed mb-10 max-w-md">
                Have a question, issue, or just want to say hi? Reach out and we&apos;ll get back to you fast.
              </p>
            </Reveal>
            <Reveal delay={0.14}>
              <div className="flex items-center gap-3 flex-wrap">
                {[
                  { icon: Clock,        text: "Mon – Sat, 9AM – 7PM IST" },
                  { icon: Zap,          text: "Typical reply under 15 hrs" },
                  { icon: CheckCircle,  text: "Real humans, no bots"      },
                ].map(({ icon: Icon, text }) => (
                  <div key={text} className="flex items-center gap-2 border border-white/[0.08] rounded-full px-3 py-2"
                    style={{ background: "rgba(255,255,255,0.03)" }}>
                    <Icon className="w-3.5 h-3.5 text-[#7c6ff7]" />
                    <span className="text-white/40 text-xs font-medium">{text}</span>
                  </div>
                ))}
              </div>
            </Reveal>
          </div>

          {/* Right: channel cards */}
          <div className="flex flex-col gap-3">
            {CHANNELS.map(({ icon: Icon, accent, label, value, desc, href, response }, i) => (
              <Reveal key={label} delay={0.12 + i * 0.08}>
                <motion.a href={href} whileHover={{ x: 4 }} transition={{ type: "spring", stiffness: 300 }}
                  className="group flex items-center gap-4 rounded-2xl px-5 py-4 border border-white/[0.07] transition-all"
                  style={{ background: "rgba(255,255,255,0.04)" }}
                  onMouseEnter={e => (e.currentTarget.style.borderColor = `${accent}35`)}
                  onMouseLeave={e => (e.currentTarget.style.borderColor = "rgba(255,255,255,0.07)")}>
                  <div className="w-11 h-11 rounded-xl flex items-center justify-center shrink-0"
                    style={{ background: `${accent}18` }}>
                    <Icon className="w-5 h-5" style={{ color: accent }} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-white/60 text-[10px] font-black uppercase tracking-widest mb-0.5">{label}</p>
                    <p className="text-white font-bold text-sm truncate">{value}</p>
                    <p className="text-white/30 text-xs mt-0.5">{desc}</p>
                  </div>
                  <div className="shrink-0 text-right">
                    <span className="text-[10px] font-bold px-2 py-1 rounded-full" style={{ color: accent, background: `${accent}15` }}>
                      {response}
                    </span>
                    <ArrowRight className="w-4 h-4 text-white/20 group-hover:text-white/50 group-hover:translate-x-0.5 transition-all mt-2 ml-auto" />
                  </div>
                </motion.a>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* ══ EMAIL CARDS (click to copy) ══ */}
      <section className="py-20 px-6 bg-white">
        <div className="px-8 py-6">
          <Reveal className="mb-12">
            <div className="flex items-center gap-3 mb-5">
              <div className="h-px w-8 bg-[#7c6ff7]" />
              <span className="text-[10px] font-black text-[#7c6ff7] uppercase tracking-[0.28em]">Contact channels</span>
            </div>
            <h2 className="text-4xl font-black text-gray-900 tracking-tight">Pick the right inbox.</h2>
            <p className="text-gray-400 mt-2 text-sm">Click any card to copy the email address.</p>
          </Reveal>

          <div className="grid sm:grid-cols-3 gap-5">
            {CHANNELS.map(({ icon: Icon, accent, label, value, desc, response }, i) => (
              <Reveal key={label} delay={i * 0.08}>
                <motion.button onClick={() => copy(value)}
                  whileHover={{ y: -5, boxShadow: `0 20px 60px ${accent}14` }}
                  transition={{ type: "spring", stiffness: 260 }}
                  className="w-full text-left rounded-3xl border border-gray-100 bg-white p-7 transition-all hover:border-gray-200 group relative overflow-hidden">
                  {/* Accent blob */}
                  <div className="absolute -top-8 -right-8 w-24 h-24 rounded-full blur-2xl opacity-0 group-hover:opacity-60 transition-opacity duration-500 pointer-events-none"
                    style={{ background: accent }} />

                  <div className="relative">
                    <div className="flex items-start justify-between mb-5">
                      <div className="w-12 h-12 rounded-2xl flex items-center justify-center" style={{ background: `${accent}15` }}>
                        <Icon className="w-6 h-6" style={{ color: accent }} />
                      </div>
                      <AnimatePresence mode="wait">
                        {copied === value ? (
                          <motion.span key="copied" initial={{ scale: 0.8, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ opacity: 0 }}
                            className="text-[10px] font-bold px-2.5 py-1 rounded-full flex items-center gap-1"
                            style={{ color: accent, background: `${accent}15` }}>
                            <CheckCircle className="w-3 h-3" /> Copied!
                          </motion.span>
                        ) : (
                          <motion.span key="copy" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                            className="text-[10px] font-bold text-gray-300 group-hover:text-gray-400 transition-colors px-2 py-1">
                            Click to copy
                          </motion.span>
                        )}
                      </AnimatePresence>
                    </div>

                    <p className="text-[10px] font-black text-gray-300 uppercase tracking-widest mb-1">{label}</p>
                    <p className="text-gray-900 font-bold text-base mb-1 break-all" style={{ color: accent }}>{value}</p>
                    <p className="text-gray-400 text-sm leading-relaxed mb-5">{desc}</p>

                    <div className="flex items-center gap-2">
                      <Clock className="w-3.5 h-3.5 text-gray-300" />
                      <span className="text-xs text-gray-400">Avg. response: <span className="font-semibold text-gray-600">{response}</span></span>
                    </div>
                  </div>
                </motion.button>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* ══ SELF-SERVICE ══ */}
      <section className="py-20 px-6 bg-gray-50">
        <div className="px-8 py-6">
          <Reveal className="mb-12">
            <div className="flex items-center gap-3 mb-5">
              <div className="h-px w-8 bg-gray-300" />
              <span className="text-[10px] font-black text-gray-400 uppercase tracking-[0.28em]">Self-service</span>
            </div>
            <h2 className="text-4xl font-black text-gray-900 tracking-tight">Resolve it yourself,<br /><span className="text-gray-200">faster.</span></h2>
            <p className="text-gray-400 mt-3 text-sm max-w-md leading-relaxed">
              Most issues can be resolved without emailing us. Try these first.
            </p>
          </Reveal>

          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {SELF_SERVICE.map(({ icon: Icon, accent, label, sub, href }, i) => (
              <Reveal key={label} delay={i * 0.07}>
                <Link href={href}>
                  <motion.div whileHover={{ y: -4, boxShadow: `0 12px 40px ${accent}12` }}
                    transition={{ type: "spring", stiffness: 260 }}
                    className="bg-white rounded-2xl border border-gray-100 p-6 h-full hover:border-gray-200 transition-all group">
                    <div className="w-10 h-10 rounded-xl flex items-center justify-center mb-4 transition-transform group-hover:scale-110"
                      style={{ background: `${accent}15` }}>
                      <Icon className="w-5 h-5" style={{ color: accent }} />
                    </div>
                    <p className="text-gray-900 font-bold text-sm mb-1">{label}</p>
                    <p className="text-gray-400 text-xs leading-relaxed mb-4">{sub}</p>
                    <div className="flex items-center gap-1 text-xs font-semibold" style={{ color: accent }}>
                      Go <ArrowRight className="w-3 h-3 group-hover:translate-x-0.5 transition-transform" />
                    </div>
                  </motion.div>
                </Link>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* ══ FAQ ══ */}
      <section className="py-20 px-6 bg-white">
        <div className="px-8 py-6">
          <Reveal className="mb-12">
            <div className="flex items-center gap-3 mb-5">
              <div className="h-px w-8 bg-gray-200" />
              <span className="text-[10px] font-black text-gray-400 uppercase tracking-[0.28em]">Quick answers</span>
            </div>
            <h2 className="text-4xl font-black text-gray-900 tracking-tight">Common questions</h2>
          </Reveal>
          <div className="space-y-2.5">
            {FAQS.map(({ q, a }, i) => <FAQItem key={q} q={q} a={a} i={i} />)}
          </div>
          <Reveal delay={0.2} className="mt-8 text-center">
            <Link href="/faq" className="inline-flex items-center gap-2 text-[#7c6ff7] text-sm font-semibold hover:underline underline-offset-2">
              View all FAQ <ArrowRight className="w-4 h-4" />
            </Link>
          </Reveal>
        </div>
      </section>

      {/* ══ BOTTOM CTA ══ */}
      <section className="py-20 px-6 bg-[#06040f] relative overflow-hidden">
        <div className="absolute inset-0 opacity-[0.035]" style={{ backgroundImage: "radial-gradient(rgba(255,255,255,0.8) 1px,transparent 1px)", backgroundSize: "28px 28px" }} />
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_60%_70%_at_50%_50%,rgba(124,111,247,0.15),transparent)]" />

        <div className="relative z-10 px-8 py-6">
          <div className="grid sm:grid-cols-2 gap-6 items-center">
            <Reveal>
              <h2 className="text-3xl sm:text-4xl font-black text-white tracking-tight leading-tight">
                Still not sure<br />
                <span className="text-transparent bg-clip-text" style={{ backgroundImage: "linear-gradient(135deg,#7c6ff7,#34d399)" }}>
                  who to email?
                </span>
              </h2>
              <p className="text-white/35 text-sm mt-4 leading-relaxed">
                Start with support@editbridge.in — we&apos;ll route it to the right team for you.
              </p>
            </Reveal>
            <Reveal delay={0.08}>
              <div className="flex flex-col gap-3">
                <a href="mailto:support@editbridge.in"
                  className="inline-flex items-center justify-center gap-2 bg-[#7c6ff7] hover:bg-[#6a5ef0] text-white font-bold px-6 py-4 rounded-2xl text-sm transition-all shadow-[0_8px_32px_rgba(124,111,247,0.4)]">
                  <Mail className="w-4 h-4" /> support@editbridge.in
                </a>
                <p className="text-white/20 text-xs text-center">
                  For security issues:{" "}
                  <a href="mailto:security@editbridge.in" className="text-white/40 hover:text-white/60 underline underline-offset-2 transition-colors">
                    security@editbridge.in
                  </a>
                </p>
              </div>
            </Reveal>
          </div>
        </div>
      </section>

    </div>
  );
}