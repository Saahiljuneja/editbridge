"use client";

import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import {
  Search, ShieldCheck, CheckCircle, Briefcase,
  IndianRupee, Lock, MessageSquare, ArrowRight,
  FileCheck, Star, ChevronDown,
} from "lucide-react";
import { useState } from "react";
import { cn } from "@/lib/utils";

/* ── helpers ── */
function Reveal({ children, delay = 0, className = "" }: { children: React.ReactNode; delay?: number; className?: string }) {
  return (
    <motion.div initial={{ opacity: 0, y: 24 }} whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-60px" }} transition={{ duration: 0.7, delay, ease: [0.22, 1, 0.36, 1] }}
      className={className}>
      {children}
    </motion.div>
  );
}

/* ── data ── */
const CLIENT_STEPS = [
  {
    n: "01", icon: Search, accent: "#7c6ff7",
    title: "Browse verified editors",
    desc: "Filter by niche, delivery time, and price. Every editor is KYC-verified with a government ID before they can accept any order.",
    pill: "KYC verified only",
  },
  {
    n: "02", icon: Lock, accent: "#38bdf8",
    title: "Pay with full protection",
    desc: "Your payment is held securely — it is never released to the editor until you explicitly approve the delivered work. Your money is never at risk.",
    pill: "₹0 risk to you",
  },
  {
    n: "03", icon: MessageSquare, accent: "#34d399",
    title: "Collaborate in real time",
    desc: "Share your brief, send reference clips, and leave feedback — all inside EditBridge. No scattered DMs, no lost files.",
    pill: "Everything in one place",
  },
  {
    n: "04", icon: CheckCircle, accent: "#fbbf24",
    title: "Approve & download",
    desc: "Happy with the result? Approve and your files download instantly. Need tweaks? Revision rounds are included in every package.",
    pill: "Revisions included",
  },
];

const EDITOR_STEPS = [
  {
    n: "01", icon: ShieldCheck, accent: "#34d399",
    title: "Complete KYC verification",
    desc: "Upload a government-issued ID (Aadhaar, PAN, or Passport) and a selfie. Our team reviews your application within 1–2 business days.",
  },
  {
    n: "02", icon: Briefcase, accent: "#7c6ff7",
    title: "Build your profile & packages",
    desc: "Write your bio, list your skills and tools, upload portfolio samples, and create up to three pricing packages for clients to choose from.",
  },
  {
    n: "03", icon: FileCheck, accent: "#38bdf8",
    title: "Receive orders & deliver",
    desc: "Clients book directly through your profile. Communicate, deliver files, and track everything from your dashboard.",
  },
  {
    n: "04", icon: IndianRupee, accent: "#fbbf24",
    title: "Get paid reliably",
    desc: "Once the client approves your delivery, 85% of the payment is released directly to your bank account or UPI — no chasing, no delays.",
  },
];

const GUARANTEES = [
  { icon: Lock,       label: "Payment protection",  desc: "Funds held until you approve — never before." },
  { icon: ShieldCheck,label: "KYC-verified editors", desc: "Every editor verified with a government ID."    },
  { icon: Star,       label: "Revision guarantee",  desc: "Revisions are part of every package, always."  },
  { icon: CheckCircle,label: "Dispute resolution",  desc: "Our team mediates if anything goes wrong."      },
];

const FAQ = [
  { q: "What happens if I'm not happy with the delivery?",
    a: "You can request revisions within your package's revision limit. If there's a fundamental issue, you can open a dispute and our team will review the case and mediate." },
  { q: "When does the editor get paid?",
    a: "Payment is released only after you click 'Approve'. If you don't take action within 7 days of delivery, the order is automatically approved and payment is released." },
  { q: "Is my payment safe?",
    a: "Yes. All payments are held securely and never transferred to the editor until you approve the delivery or the 7-day window expires. You are never at risk of losing money for work you didn't approve." },
  { q: "How long does KYC take for editors?",
    a: "KYC applications are typically reviewed within 1–2 business days. You'll receive an email as soon as a decision is made." },
  { q: "What percentage does EditBridge take?",
    a: "EditBridge charges a 20% platform fee on each order. Editors receive 80% of every payment. Clients pay a small processing fee on top of the package price." },
  { q: "Can I cancel an order?",
    a: "Orders can be cancelled before the editor begins work. Once work has started, our dispute team will assess the situation and decide on a fair resolution." },
];

function FAQItem({ q, a, index }: { q: string; a: string; index: number }) {
  const [open, setOpen] = useState(false);
  return (
    <Reveal delay={index * 0.06}>
      <button onClick={() => setOpen(o => !o)} className="w-full text-left">
        <div className={cn("rounded-2xl border transition-all overflow-hidden", open ? "border-[#7c6ff7]/30 bg-[#7c6ff7]/[0.03]" : "border-gray-100 bg-white hover:border-gray-200")}>
          <div className="flex items-center justify-between px-6 py-5 gap-4">
            <span className="text-gray-900 font-semibold text-sm">{q}</span>
            <motion.div animate={{ rotate: open ? 180 : 0 }} transition={{ duration: 0.25 }} className="shrink-0">
              <ChevronDown className="w-4 h-4 text-gray-400" />
            </motion.div>
          </div>
          <AnimatePresence initial={false}>
            {open && (
              <motion.div initial={{ height: 0 }} animate={{ height: "auto" }} exit={{ height: 0 }}
                transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }} className="overflow-hidden">
                <p className="px-6 pb-5 text-gray-500 text-sm leading-relaxed">{a}</p>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </button>
    </Reveal>
  );
}

export default function HowItWorksPage() {
  return (
    <div className="flex flex-col">

      {/* ── Hero ── */}
      <section className="relative bg-slate-50/50 border-b border-neutral-200/50 pt-28 pb-24 px-6 overflow-hidden">
        <div className="absolute inset-0 opacity-[0.03]" style={{ backgroundImage: "linear-gradient(rgba(0,0,0,0.6) 1px,transparent 1px),linear-gradient(90deg,rgba(0,0,0,0.6) 1px,transparent 1px)", backgroundSize: "48px 48px" }} />
        <div className="absolute top-0 left-1/3 w-96 h-96 rounded-full blur-[120px] opacity-[0.08] pointer-events-none" style={{ background: "#7c6ff7" }} />
        <div className="absolute bottom-0 right-1/4 w-64 h-64 rounded-full blur-[100px] opacity-[0.05] pointer-events-none" style={{ background: "#34d399" }} />

        <div className="relative z-10 px-8 text-center">
          <Reveal>
            <div className="inline-flex items-center gap-2 border border-violet-200 bg-violet-50 text-violet-750 text-[11px] font-black tracking-[0.2em] uppercase px-4 py-2 rounded-full mb-8">
              How it works
            </div>
            <h1 className="text-5xl sm:text-7xl font-black text-neutral-900 tracking-tight leading-[0.95] mb-6">
              Simple. Safe.<br />
              <span className="text-transparent bg-clip-text" style={{ backgroundImage: "linear-gradient(135deg,#7c6ff7,#34d399)" }}>
                Built for creators.
              </span>
            </h1>
            <p className="text-neutral-500 text-lg px-8 py-6 leading-relaxed mb-10">
              A transparent process for clients and editors — with verified payment protection and verified identities at every step.
            </p>
            <div className="flex items-center justify-center gap-4 flex-wrap">
              <Link href="/browse" className="inline-flex items-center gap-2 bg-[#7c6ff7] hover:bg-[#6a5ef0] text-white font-bold px-6 py-3 rounded-xl text-sm transition-all shadow-[0_8px_24px_rgba(124,111,247,0.4)]">
                Find an editor <ArrowRight className="w-4 h-4" />
              </Link>
              <Link href="/signup/editor" className="inline-flex items-center gap-2 border border-neutral-200 hover:border-neutral-300 text-neutral-600 hover:text-neutral-900 bg-white shadow-sm font-bold px-6 py-3 rounded-xl text-sm transition-all">
                Join as editor
              </Link>
            </div>
          </Reveal>
        </div>
      </section>

      {/* ── Guarantees bar ── */}
      <section className="bg-white border-b border-gray-100 py-8 px-6">
        <div className="px-8 grid grid-cols-2 sm:grid-cols-4 gap-6">
          {GUARANTEES.map(({ icon: Icon, label, desc }, i) => (
            <Reveal key={label} delay={i * 0.07}>
              <div className="flex flex-col items-center text-center gap-2">
                <div className="w-10 h-10 rounded-xl bg-[#7c6ff7]/10 flex items-center justify-center mb-1">
                  <Icon className="w-5 h-5 text-[#7c6ff7]" />
                </div>
                <p className="text-gray-900 font-bold text-sm">{label}</p>
                <p className="text-gray-400 text-xs leading-snug">{desc}</p>
              </div>
            </Reveal>
          ))}
        </div>
      </section>

      {/* ── For Clients ── */}
      <section className="py-14 md:py-24 px-6 bg-white">
        <div className="px-8">
          <Reveal className="mb-10 md:mb-16">
            <div className="flex items-center gap-3 mb-4">
              <div className="h-px w-8 bg-[#7c6ff7]" />
              <span className="text-[10px] font-black text-[#7c6ff7] uppercase tracking-[0.28em]">For clients</span>
            </div>
            <h2 className="text-4xl sm:text-5xl font-black text-gray-900 tracking-tight leading-tight">
              Get your content edited<br />
              <span className="text-gray-200">without the risk.</span>
            </h2>
          </Reveal>

          <div className="relative">
            {/* vertical line */}
            <div className="absolute left-5 top-6 bottom-6 w-px bg-gray-100 hidden sm:block" />

            <div className="space-y-4">
              {CLIENT_STEPS.map(({ n, icon: Icon, accent, title, desc, pill }, i) => (
                <Reveal key={n} delay={i * 0.08}>
                  <motion.div whileHover={{ x: 4 }} transition={{ type: "spring", stiffness: 300 }}
                    className="relative flex gap-5 sm:gap-8 p-6 rounded-2xl border border-gray-100 bg-white hover:border-gray-200 hover:shadow-[0_8px_32px_rgba(0,0,0,0.06)] transition-all">
                    {/* Circle */}
                    <div className="shrink-0 relative z-10">
                      <div className="w-10 h-10 rounded-full flex items-center justify-center border-2" style={{ background: `${accent}15`, borderColor: `${accent}30` }}>
                        <Icon className="w-4 h-4" style={{ color: accent }} />
                      </div>
                    </div>
                    <div className="flex-1 min-w-0 pt-1">
                      <div className="flex items-center gap-2.5 mb-2 flex-wrap">
                        <span className="text-[10px] font-black tracking-widest text-gray-300">{n}</span>
                        <h3 className="text-gray-900 font-bold text-base">{title}</h3>
                        <span className="text-[9px] font-bold px-2 py-0.5 rounded-full" style={{ color: accent, background: `${accent}12`, border: `1px solid ${accent}30` }}>{pill}</span>
                      </div>
                      <p className="text-gray-500 text-sm leading-relaxed">{desc}</p>
                    </div>
                  </motion.div>
                </Reveal>
              ))}
            </div>
          </div>

          <Reveal delay={0.3} className="mt-10">
            <Link href="/browse" className="inline-flex items-center gap-2 bg-[#7c6ff7] hover:bg-[#6a5ef0] text-white font-bold px-7 py-3.5 rounded-xl text-sm transition-all shadow-[0_8px_24px_rgba(124,111,247,0.35)]">
              Browse editors now <ArrowRight className="w-4 h-4" />
            </Link>
          </Reveal>
        </div>
      </section>

      {/* ── For Editors ── */}
      <section className="py-14 md:py-24 px-6 bg-gray-50">
        <div className="px-8">
          <Reveal className="mb-10 md:mb-16">
            <div className="flex items-center gap-3 mb-4">
              <div className="h-px w-8 bg-[#34d399]" />
              <span className="text-[10px] font-black text-[#059669] uppercase tracking-[0.28em]">For editors</span>
            </div>
            <h2 className="text-4xl sm:text-5xl font-black text-gray-900 tracking-tight leading-tight">
              Build your editing career<br />
              <span className="text-gray-200">on solid ground.</span>
            </h2>
          </Reveal>

          <div className="grid sm:grid-cols-2 gap-5">
            {EDITOR_STEPS.map(({ n, icon: Icon, accent, title, desc }, i) => (
              <Reveal key={n} delay={i * 0.08}>
                <motion.div whileHover={{ y: -4, boxShadow: `0 16px 48px ${accent}18` }}
                  transition={{ type: "spring", stiffness: 260 }}
                  className="bg-white rounded-2xl border border-gray-100 p-7 h-full transition-all">
                  <div className="flex items-center gap-3 mb-4">
                    <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: `${accent}15` }}>
                      <Icon className="w-5 h-5" style={{ color: accent }} />
                    </div>
                    <span className="text-[11px] font-black tracking-widest text-gray-200">{n}</span>
                  </div>
                  <h3 className="font-bold text-gray-900 text-base mb-2">{title}</h3>
                  <p className="text-gray-500 text-sm leading-relaxed">{desc}</p>
                </motion.div>
              </Reveal>
            ))}
          </div>

          <Reveal delay={0.3} className="mt-10">
            <Link href="/signup/editor" className="inline-flex items-center gap-2 bg-[#059669] hover:bg-[#047857] text-white font-bold px-7 py-3.5 rounded-xl text-sm transition-all shadow-[0_8px_24px_rgba(5,150,105,0.35)]">
              Apply as editor <ArrowRight className="w-4 h-4" />
            </Link>
          </Reveal>
        </div>
      </section>

      {/* ── FAQ ── */}
      <section className="py-14 md:py-24 px-6 bg-white">
        <div className="px-8">
          <Reveal className="mb-8 md:mb-14 text-center">
            <div className="flex items-center justify-center gap-3 mb-4">
              <div className="h-px w-8 bg-gray-200" />
              <span className="text-[10px] font-black text-gray-400 uppercase tracking-[0.28em]">FAQ</span>
              <div className="h-px w-8 bg-gray-200" />
            </div>
            <h2 className="text-4xl font-black text-gray-900 tracking-tight">Common questions</h2>
            <p className="text-gray-400 mt-3 text-sm">Can&apos;t find what you&apos;re looking for? <Link href="/browse" className="text-[#7c6ff7] underline-offset-2 hover:underline">Contact us</Link></p>
          </Reveal>

          <div className="space-y-2.5">
            {FAQ.map(({ q, a }, i) => (
              <FAQItem key={q} q={q} a={a} index={i} />
            ))}
          </div>
        </div>
      </section>

      {/* ── Bottom CTA ── */}
      <section className="relative bg-slate-50/50 border-t border-neutral-200/60 py-14 md:py-24 px-6 overflow-hidden">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_60%_80%_at_50%_50%,rgba(124,111,247,0.05),transparent)]" />
        <div className="relative z-10 px-8 text-center">
          <Reveal>
            <h2 className="text-4xl sm:text-5xl font-black text-neutral-900 tracking-tight leading-tight mb-5">
              Ready to get started?
            </h2>
            <p className="text-neutral-500 text-base mb-10 leading-relaxed">
              Browse verified editors and place your first order in minutes. Your payment is protected until you approve.
            </p>
            <div className="flex items-center justify-center gap-4 flex-wrap">
              <Link href="/browse" className="inline-flex items-center gap-2 bg-[#7c6ff7] hover:bg-[#6a5ef0] text-white font-bold px-8 py-4 rounded-xl text-sm transition-all shadow-[0_8px_32px_rgba(124,111,247,0.45)]">
                Browse editors <ArrowRight className="w-4 h-4" />
              </Link>
              <Link href="/signup/editor" className="inline-flex items-center gap-2 border border-neutral-200 hover:border-neutral-300 text-neutral-600 hover:text-neutral-900 bg-white shadow-sm font-bold px-8 py-4 rounded-xl text-sm transition-all">
                Join as editor
              </Link>
            </div>
          </Reveal>
        </div>
      </section>

    </div>
  );
}