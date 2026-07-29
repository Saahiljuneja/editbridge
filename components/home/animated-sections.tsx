"use client";

import { useRef, useEffect, useState, useCallback } from "react";
import {
  motion, useInView, useMotionValue, useTransform,
  useSpring, AnimatePresence, useScroll, useReducedMotion,
} from "framer-motion";
import Link from "next/link";
import {
  Star, ShieldCheck, Lock, ArrowRight, CheckCircle,
  Clock, Users, Zap, FileCheck, MessageSquare, ThumbsUp,
  ChevronLeft, ChevronRight, ArrowUpRight, Bell, Package,
  TrendingUp, X, Check, Search, ChevronUp,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { PortfolioPreview } from "@/components/common/portfolio-preview";
import { FRAME_STYLES, type FrameKey } from "@/lib/xp-shop-config";

/* ════════════════════════════════════════════════════════════════════════════
   SCROLL PROGRESS BAR
════════════════════════════════════════════════════════════════════════════ */
export function ScrollProgressBar() {
  const { scrollYProgress } = useScroll();
  const scaleX = useSpring(scrollYProgress, { stiffness: 120, damping: 30 });
  return (
    <motion.div
      className="fixed top-0 left-0 right-0 z-[9999] origin-left pointer-events-none"
      style={{ height: 2, scaleX, background: "linear-gradient(90deg, #F59E0B, #0EA5E9)" }}
    />
  );
}

/* ─── Helpers ────────────────────────────────────────────────────────────── */
function useMouseGlow(containerRef: React.RefObject<HTMLElement | null>) {
  const x = useMotionValue(-999); const y = useMotionValue(-999);
  useEffect(() => {
    const el = containerRef.current; if (!el) return;
    const move = (e: MouseEvent) => {
      const r = el.getBoundingClientRect();
      x.set(e.clientX - r.left); y.set(e.clientY - r.top);
    };
    const leave = () => { x.set(-999); y.set(-999); };
    el.addEventListener("mousemove", move);
    el.addEventListener("mouseleave", leave);
    return () => { el.removeEventListener("mousemove", move); el.removeEventListener("mouseleave", leave); };
  }, [x, y, containerRef]);
  return { x, y };
}

function TiltCard({ children, className, intensity = 10 }: { children: React.ReactNode; className?: string; intensity?: number }) {
  const ref = useRef<HTMLDivElement>(null);
  const mx = useMotionValue(0); const my = useMotionValue(0);
  const rX = useSpring(useTransform(my, [-0.5, 0.5], [intensity, -intensity]), { stiffness: 180, damping: 22 });
  const rY = useSpring(useTransform(mx, [-0.5, 0.5], [-intensity, intensity]), { stiffness: 180, damping: 22 });
  const onMove = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    if (!ref.current) return;
    const r = ref.current.getBoundingClientRect();
    mx.set((e.clientX - r.left) / r.width - 0.5); my.set((e.clientY - r.top) / r.height - 0.5);
  }, [mx, my]);
  return (
    <motion.div ref={ref} onMouseMove={onMove} onMouseLeave={() => { mx.set(0); my.set(0); }}
      style={{ rotateX: rX, rotateY: rY, transformStyle: "preserve-3d", perspective: 900 }} className={className}>
      {children}
    </motion.div>
  );
}

function Reveal({ children, delay = 0, className, from = "bottom" }: { children: React.ReactNode; delay?: number; className?: string; from?: "bottom"|"left"|"right" }) {
  const ref = useRef(null);
  const inView = useInView(ref, { once: true, margin: "-60px" });
  const init = from === "left" ? { opacity: 0, x: -48 } : from === "right" ? { opacity: 0, x: 48 } : { opacity: 0, y: 40 };
  return (
    <motion.div ref={ref} initial={init} animate={inView ? { opacity: 1, x: 0, y: 0 } : {}}
      transition={{ duration: 0.85, delay, ease: [0.22, 1, 0.36, 1] }} className={className}>
      {children}
    </motion.div>
  );
}

function Counter({ to, suffix = "" }: { to: number; suffix?: string }) {
  const [n, setN] = useState(0); const ref = useRef(null);
  const inView = useInView(ref, { once: true });
  const prefersReduced = useReducedMotion();
  useEffect(() => {
    if (!inView) return;
    if (prefersReduced) { setN(to); return; }
    // Timecode-style: chunky 22fps ticks, not smooth linear (Fix 22)
    let cur = 0; const INTERVAL = 1000 / 22; const TOTAL_FRAMES = 1500 / INTERVAL;
    const inc = to / TOTAL_FRAMES;
    const t = setInterval(() => { cur += inc; if (cur >= to) { setN(to); clearInterval(t); } else setN(Math.floor(cur)); }, INTERVAL);
    return () => clearInterval(t);
  }, [inView, to, prefersReduced]);
  return <span ref={ref}>{n.toLocaleString()}{suffix}</span>;
}

function MagBtn({ children, className }: { children: React.ReactNode; className?: string }) {
  const ref = useRef<HTMLDivElement>(null);
  const bx = useMotionValue(0); const by = useMotionValue(0);
  const sx = useSpring(bx, { stiffness: 200, damping: 20 }); const sy = useSpring(by, { stiffness: 200, damping: 20 });
  const onMove = useCallback((e: React.MouseEvent) => {
    if (!ref.current) return;
    const r = ref.current.getBoundingClientRect();
    bx.set((e.clientX - (r.left + r.width / 2)) * 0.3); by.set((e.clientY - (r.top + r.height / 2)) * 0.3);
  }, [bx, by]);
  return (
    <motion.div ref={ref} onMouseMove={onMove} onMouseLeave={() => { bx.set(0); by.set(0); }}
      style={{ x: sx, y: sy }} className={className}>{children}</motion.div>
  );
}


/* ════════════════════════════════════════════════════════════════════════════
   HERO — light theme
════════════════════════════════════════════════════════════════════════════ */
const NICHES = ["YouTube.", "Reels.", "Shorts.", "Podcasts.", "Ads."];

export function AnimatedHero({ availableCount = 0 }: { availableCount?: number }) {
  const [idx, setIdx] = useState(0);
  const [progress, setProgress] = useState(54);
  const heroRef = useRef<HTMLElement>(null);
  const { scrollYProgress } = useScroll({ target: heroRef, offset: ["start start", "end start"] });
  const headY  = useTransform(scrollYProgress, [0, 1], ["0%", "12%"]);
  const prefersReduced = useReducedMotion();

  // Mouse-tracking orb (Fix 12)
  const { x: rawMouseX, y: rawMouseY } = useMouseGlow(heroRef as React.RefObject<HTMLElement | null>);
  const orbX = useSpring(rawMouseX, { stiffness: 50, damping: 20 });
  const orbY = useSpring(rawMouseY, { stiffness: 50, damping: 20 });
  const orbXPos = useTransform(orbX, (v: number) => v - 300);
  const orbYPos = useTransform(orbY, (v: number) => v - 300);
  const orbOpacity = useTransform(rawMouseX, (v: number) => v <= -900 ? 0 : 0.65);

  useEffect(() => {
    if (prefersReduced) return;
    const a = setInterval(() => setIdx(i => (i + 1) % NICHES.length), 2800);
    const b = setInterval(() => setProgress(p => p >= 95 ? 24 : p + 1), 95);
    return () => { clearInterval(a); clearInterval(b); };
  }, [prefersReduced]);

  return (
    <section ref={heroRef} className="relative min-h-screen bg-[#080E1A] overflow-hidden flex flex-col">

      {/* Film-cut flash on page load */}
      <motion.div className="absolute inset-0 bg-black z-50 pointer-events-none"
        initial={{ opacity: 0.85 }} animate={{ opacity: 0 }}
        transition={{ duration: 0.07, ease: "linear" }} />

      {/* Subtle dot grid */}
      <div className="absolute inset-0 pointer-events-none opacity-[0.04]"
        style={{ backgroundImage: "radial-gradient(#ffffff 1px, transparent 1px)", backgroundSize: "28px 28px" }} />

      {/* Ambient glow blobs */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        <motion.div animate={{ x: ["0%","10%","0%"], y: ["0%","8%","0%"], scale:[1,1.08,1] }}
          transition={{ duration: 22, repeat: Infinity, ease: "easeInOut" }}
          className="absolute -top-1/3 -left-1/4 w-[900px] h-[700px] rounded-full"
          style={{ background: "radial-gradient(ellipse, rgba(14,165,233,0.22), transparent 65%)" }} />
        <motion.div animate={{ x: ["0%","-8%","0%"], y: ["0%","10%","0%"] }}
          transition={{ duration: 28, repeat: Infinity, ease: "easeInOut", delay: 5 }}
          className="absolute -bottom-1/4 -right-1/4 w-[800px] h-[700px] rounded-full"
          style={{ background: "radial-gradient(ellipse, rgba(124,58,237,0.18), transparent 65%)" }} />
        <motion.div animate={{ x: ["0%","6%","0%"], y: ["0%","-8%","0%"] }}
          transition={{ duration: 24, repeat: Infinity, ease: "easeInOut", delay: 10 }}
          className="absolute top-1/3 left-1/2 w-[600px] h-[500px] rounded-full"
          style={{ background: "radial-gradient(ellipse, rgba(14,165,233,0.10), transparent 65%)" }} />
      </div>

      {/* Mouse-tracking gradient orb — desktop only */}
      <motion.div
        className="absolute pointer-events-none hidden lg:block rounded-full z-0"
        style={{ top: 0, left: 0, x: orbXPos, y: orbYPos, opacity: orbOpacity, width: 600, height: 600,
          background: "radial-gradient(ellipse at center, rgba(14,165,233,0.35) 0%, rgba(124,58,237,0.15) 45%, transparent 68%)",
          filter: "blur(32px)" }}
      />

      {/* Top announcement bar */}
      <motion.div initial={{ opacity: 0, y: -16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6 }}
        className="relative z-10 border-b border-white/8 py-3 px-6 bg-white/5 backdrop-blur-sm">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <motion.span animate={{ scale: [1, 1.8, 1] }} transition={{ duration: 1.8, repeat: Infinity }}
              className="w-1.5 h-1.5 rounded-full bg-emerald-400 inline-block" />
            <span className="text-[11px] text-white/40 font-medium tracking-wide">India&apos;s verified video editing marketplace · Launched 2026</span>
          </div>
          <div className="hidden md:flex items-center divide-x divide-white/8">
            {([["KYC Verified", ShieldCheck], ["Payment Protected", Lock], ["Revisions Included", CheckCircle]] as const).map(([label, Icon]) => (
              <span key={label} className="flex items-center gap-1.5 px-4 text-[11px] text-white/30 font-medium">
                <Icon className="w-3 h-3 text-sky-400" />{label}
              </span>
            ))}
          </div>
        </div>
      </motion.div>

      {/* Main content — centered */}
      <div className="relative z-10 flex-1 flex items-center px-6">
        <div className="max-w-3xl mx-auto w-full py-16 text-center">

          {/* Live badge */}
          <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1, duration: 0.6 }}
            className="inline-flex items-center gap-2 px-4 py-2 mb-8 rounded-full border border-white/10 bg-white/5 backdrop-blur-sm text-xs text-white/50 font-medium">
            <motion.span animate={{ scale: [1, 1.8, 1] }} transition={{ duration: 1.8, repeat: Infinity }}
              className="w-1.5 h-1.5 rounded-full bg-emerald-400 inline-block shrink-0" />
            {availableCount > 0 ? `${availableCount} editors available now` : "Editors online now"} · KYC-verified · ₹0 fraud, ever
          </motion.div>

          {/* Headline */}
          <motion.div style={{ y: headY }} className="mb-6">
            <h1 className="font-black tracking-[-0.04em] leading-[0.9] text-white" style={{ fontSize: "clamp(2.8rem, 7vw, 5.5rem)" }}>
              Hire the perfect<br />
              video editor for{" "}
              <span className="inline-block overflow-hidden" style={{ height: "1.1em", verticalAlign: "bottom" }}>
                <AnimatePresence mode="wait">
                  <motion.span key={idx}
                    initial={{ clipPath: "inset(0 100% 0 0)" }}
                    animate={{ clipPath: "inset(0 0% 0 0)" }}
                    exit={{ clipPath: "inset(0 0% 0 100%)", transition: { duration: 0.16, ease: [0.4, 0, 1, 0] } }}
                    transition={{ duration: 0.24, ease: [0, 0, 0.2, 1] }}
                    className="block bg-gradient-to-r from-sky-400 via-violet-400 to-teal-400 bg-clip-text text-transparent">
                    {NICHES[idx]}
                  </motion.span>
                </AnimatePresence>
              </span>
            </h1>
          </motion.div>

          {/* Description */}
          <motion.p initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.4, duration: 0.7 }}
            className="text-white/45 text-lg leading-relaxed font-medium mb-10 max-w-xl mx-auto">
            Browse portfolios, compare packages, and hire KYC-verified editors — every payment held safely in escrow until you approve.
          </motion.p>

          {/* Search bar */}
          <motion.div initial={{ opacity: 0, y: 22 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.55, duration: 0.75 }}
            className="mb-6">
            <form action="/browse" method="get"
              className="flex items-center gap-2 bg-white rounded-2xl p-1.5 shadow-2xl shadow-black/50 max-w-2xl mx-auto">
              <Search className="w-5 h-5 text-gray-400 ml-3 shrink-0" />
              <input
                name="q"
                type="text"
                placeholder="Find editors for Gaming, Reels, YouTube..."
                className="flex-1 text-sm text-gray-700 placeholder-gray-400 outline-none bg-transparent py-3 px-1.5 min-w-0"
              />
              <button type="submit"
                className="bg-[var(--brand-client)] hover:bg-sky-600 text-white text-sm font-bold px-6 py-3 rounded-xl transition-colors shrink-0">
                Search
              </button>
            </form>
          </motion.div>

          {/* Niche quick-search chips */}
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.7, duration: 0.6 }}
            className="flex flex-wrap items-center justify-center gap-2 mb-10">
            <span className="text-xs text-white/30 font-bold">Popular:</span>
            {[
              { label: "YouTube Videos", emoji: "▶️", q: "youtube" },
              { label: "Gaming Reels", emoji: "🎮", q: "gaming" },
              { label: "Vlogs", emoji: "🎒", q: "vlog" },
              { label: "Thumbnails", emoji: "🖼️", q: "thumbnail" },
              { label: "After Effects", emoji: "✨", q: "after effects" },
              { label: "Podcasts", emoji: "🎙️", q: "podcast" },
            ].map((chip, ci) => (
              <motion.a
                key={chip.label}
                href={`/browse?q=${encodeURIComponent(chip.q)}`}
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: 0.75 + ci * 0.05, duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
                whileHover={{ scale: 1.06, y: -1 }}
                whileTap={{ scale: 0.97 }}
                className="inline-flex items-center gap-1.5 text-xs text-white/60 font-semibold bg-white/8 hover:bg-white/15 border border-white/10 hover:border-white/20 rounded-full px-3.5 py-1.5 transition-all cursor-pointer select-none"
              >
                <span className="text-[11px]">{chip.emoji}</span>
                {chip.label}
              </motion.a>
            ))}
          </motion.div>

          {/* Social proof + stats */}
          <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.9, duration: 0.6 }}
            className="flex flex-col items-center gap-4">
            <div className="flex items-center gap-4 flex-wrap justify-center">
              <div className="flex -space-x-2.5">
                {[["AK","var(--brand-editor)"],["PS","#059669"],["RK","#ea580c"],["VD","#2563eb"]].map(([i, bg], k) => (
                  <div key={k} className="w-8 h-8 rounded-full border-2 border-white/20 flex items-center justify-center text-[9px] font-bold text-white" style={{ background: bg }}>{i}</div>
                ))}
              </div>
              <p className="text-white/40 text-xs"><span className="text-white/70 font-semibold">Early creators</span> already on EditBridge</p>
              <div className="flex items-center gap-1 pl-4 border-l border-white/10">
                {[1,2,3,4,5].map(j => <Star key={j} className="w-3 h-3 text-amber-400 fill-amber-400" />)}
                <span className="text-white/40 text-xs ml-1">Loved by creators</span>
              </div>
            </div>
            <div className="flex flex-wrap items-center justify-center gap-x-4 gap-y-1">
              <span className="text-xs text-white/40 font-medium">4.9★ avg rating</span>
              <span className="text-white/15 text-xs">·</span>
              <span className="text-xs text-white/40 font-medium">Packages from ₹299</span>
              <span className="text-white/15 text-xs">·</span>
              <span className="text-xs text-white/40 font-medium">Escrow-protected</span>
              <span className="text-white/15 text-xs">·</span>
              <Link href="/find-editor" className="inline-flex items-center gap-1 text-xs font-semibold text-sky-400 hover:text-sky-300 transition-colors">
                Not sure? Let us match you <ArrowRight className="w-3 h-3" />
              </Link>
            </div>
          </motion.div>

        </div>
      </div>

      {/* Ticker */}
      <div className="relative z-10 border-t border-white/8 overflow-hidden py-3 bg-white/5 backdrop-blur-sm">
        <motion.div className="flex whitespace-nowrap" animate={{ x: ["0%","-50%"] }} transition={{ duration: 30, repeat: Infinity, ease: "linear" }}>
          {[...Array(2)].map((_, k) => (
            <div key={k} className="flex">
              {["KYC-Verified Editors","Verified Payment Protection","Revisions Included","Real-time Collaboration","Identity Verified","Dispute Resolution","Fast Delivery","Launched 2026"].map(s => (
                <span key={s} className="inline-flex items-center gap-3 text-[10px] text-white/25 font-bold uppercase tracking-[0.18em] px-8">
                  <span className="w-1 h-1 rounded-full bg-sky-400/60 inline-block" />{s}
                </span>
              ))}
            </div>
          ))}
        </motion.div>
      </div>
    </section>
  );
}

/* ════════════════════════════════════════════════════════════════════════════
   FIND EDITOR QUIZ CTA
════════════════════════════════════════════════════════════════════════════ */
export function AnimatedFindEditorCTA() {
  return (
    <section className="px-6 -mt-2 mb-2 relative z-10">
      <Reveal className="max-w-5xl mx-auto">
        <div className="relative overflow-hidden rounded-3xl bg-[#07050f] px-8 py-10 sm:px-12 sm:py-12 flex flex-col sm:flex-row items-center justify-between gap-6">
          <div className="absolute inset-0 opacity-[0.15] pointer-events-none" style={{ backgroundImage: "radial-gradient(rgba(255,255,255,0.8) 1px, transparent 1px)", backgroundSize: "24px 24px" }} />
          <div
            className="absolute -top-20 -right-20 w-64 h-64 rounded-full pointer-events-none"
            style={{ background: "radial-gradient(ellipse,#0EA5E9,transparent 70%)", opacity: 0.35 }}
          />
          <div className="relative z-10 text-center sm:text-left">
            <p className="text-[10px] font-black text-white/40 uppercase tracking-[0.28em] mb-3">Not sure where to start?</p>
            <h2 className="text-2xl sm:text-3xl font-black text-white tracking-tight leading-tight mb-2">
              Find your editor in 60 seconds
            </h2>
            <p className="text-white/40 text-sm max-w-md">
              Answer 5 quick questions about your style, budget, and deadline — we'll match you with the 3 best-fit editors.
            </p>
          </div>
          <MagBtn className="relative z-10 shrink-0">
            <Link
              href="/find-editor"
              className="inline-flex items-center gap-2.5 bg-white text-[var(--brand-client)] hover:bg-white/92 font-black px-8 py-4 text-sm rounded-2xl shadow-2xl transition-all whitespace-nowrap"
            >
              Take the quiz <ArrowRight className="w-4 h-4" />
            </Link>
          </MagBtn>
        </div>
      </Reveal>
    </section>
  );
}

/* ════════════════════════════════════════════════════════════════════════════
   STATS — bento grid (light)
════════════════════════════════════════════════════════════════════════════ */
const TRUST_STATS_DATA = [
  {
    value: "100%",
    label: "KYC Verified",
    sub: "Since day one",
    desc: "Every editor submits govt-issued ID before accepting a single order.",
    bg: "bg-zinc-950",
    Icon: ShieldCheck,
    svg: (
      <svg className="absolute right-0 top-0 h-full w-2/3 pointer-events-none opacity-100" viewBox="0 0 300 200" fill="none">
        <circle cx="220" cy="100" r="90" fill="#fff" fillOpacity="0.05" />
        <circle cx="260" cy="60"  r="60" fill="#fff" fillOpacity="0.07" />
        <circle cx="200" cy="160" r="50" fill="#fff" fillOpacity="0.04" />
        <circle cx="270" cy="150" r="30" fill="#fff" fillOpacity="0.09" />
      </svg>
    ),
  },
  {
    value: "₹0",
    label: "Lost to fraud",
    sub: "Since launch",
    desc: "Not one rupee of client funds lost. Escrow protects every payment.",
    bg: "bg-emerald-600",
    Icon: Lock,
    svg: (
      <svg className="absolute right-0 top-0 w-48 h-48 pointer-events-none" viewBox="0 0 200 200" fill="none">
        <defs><filter id="st-blur2"><feGaussianBlur stdDeviation="10" /></filter></defs>
        <ellipse cx="170" cy="60" rx="40" ry="18" fill="#fff" fillOpacity="0.13" filter="url(#st-blur2)" />
        <rect x="120" y="20" width="60" height="20" rx="8" fill="#fff" fillOpacity="0.09" />
        <polygon points="150,0 200,0 200,50" fill="#fff" fillOpacity="0.07" />
        <circle cx="180" cy="100" r="14" fill="#fff" fillOpacity="0.14" />
      </svg>
    ),
  },
  {
    value: "100%",
    label: "Escrow protected",
    sub: "Every order",
    desc: "Your payment held securely until you approve the delivered work.",
    bg: "bg-violet-600",
    Icon: Lock,
    svg: (
      <svg className="absolute right-0 top-0 w-48 h-48 pointer-events-none" viewBox="0 0 200 200" fill="none">
        <defs><filter id="st-blur3"><feGaussianBlur stdDeviation="12" /></filter></defs>
        <rect x="120" y="0" width="70" height="70" rx="35" fill="#fff" fillOpacity="0.08" filter="url(#st-blur3)" />
        <ellipse cx="170" cy="80" rx="28" ry="12" fill="#fff" fillOpacity="0.11" />
        <polygon points="200,0 200,60 140,0" fill="#fff" fillOpacity="0.06" />
        <circle cx="150" cy="30" r="10" fill="#fff" fillOpacity="0.14" />
      </svg>
    ),
  },
  {
    value: "48hrs",
    label: "Avg. kickoff time",
    sub: "Platform average",
    desc: "From booking to editor starting your project.",
    bg: "bg-[var(--brand-teal)]",
    Icon: Zap,
    svg: (
      <svg className="absolute right-0 top-0 w-48 h-48 pointer-events-none" viewBox="0 0 200 200" fill="none">
        <defs><filter id="st-blur4"><feGaussianBlur stdDeviation="16" /></filter></defs>
        <polygon points="200,0 200,100 100,0" fill="#fff" fillOpacity="0.07" />
        <ellipse cx="170" cy="40" rx="30" ry="18" fill="#fff" fillOpacity="0.11" filter="url(#st-blur4)" />
        <rect x="140" y="60" width="40" height="18" rx="8" fill="#fff" fillOpacity="0.09" />
        <circle cx="150" cy="30" r="14" fill="#fff" fillOpacity="0.15" />
        <line x1="120" y1="0" x2="200" y2="80" stroke="#fff" strokeOpacity="0.06" strokeWidth="6" />
      </svg>
    ),
  },
];

export function AnimatedStats({ editorCount = 100, completedOrders = 0, totalPaid = 0 }: { editorCount?: number; completedOrders?: number; totalPaid?: number }) {
  void editorCount; void completedOrders; void totalPaid;
  const ref = useRef(null);
  const inView = useInView(ref, { once: true, margin: "-80px" });

  return (
    <section ref={ref} className="bg-white py-10 md:py-16 px-6 overflow-hidden">
      <div className="max-w-7xl mx-auto">
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={inView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
          className="mb-10 md:mb-14 min-w-0"
        >
          <p className="text-[11px] font-black text-gray-400 uppercase tracking-[0.22em] mb-3">Platform trust</p>
          <h2 className="text-3xl sm:text-4xl font-black text-gray-900 tracking-tight leading-tight">
            Numbers we stand behind.
          </h2>
        </motion.div>

        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 md:gap-5">
          {TRUST_STATS_DATA.map(({ value, label, sub, desc, bg, Icon, svg }, i) => (
            <motion.div
              key={label}
              initial={{ opacity: 0, y: 24 }}
              animate={inView ? { opacity: 1, y: 0 } : {}}
              transition={{ duration: 0.65, delay: 0.1 + i * 0.1, ease: [0.22, 1, 0.36, 1] }}
              className={cn("relative overflow-hidden rounded-2xl p-5 md:p-6 flex flex-col justify-between min-h-[180px] md:min-h-[200px]", bg)}
            >
              {/* Decorative SVG */}
              {svg}

              <div className="relative z-10">
                <Icon className="w-4 h-4 text-white/50 mb-4 md:mb-5" strokeWidth={1.8} />
                <p className="text-3xl md:text-4xl font-black text-white leading-none tracking-tight">{value}</p>
              </div>

              <div className="relative z-10 mt-4 border-t border-white/15 pt-3">
                <p className="text-sm font-bold text-white/90 leading-snug">{label}</p>
                <p className="text-[11px] text-white/50 mt-0.5 mb-2">{sub}</p>
                <p className="text-[11px] text-white/40 leading-relaxed hidden md:block">{desc}</p>
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}

/* ════════════════════════════════════════════════════════════════════════════
   LIVE ACTIVITY FEED
════════════════════════════════════════════════════════════════════════════ */
const ACTIVITY = [
  { type: "order",    name: "Ankit V.",  action: "placed an order with Priya S.",        time: "2m ago",   col: "var(--brand-client)", amount: "₹1,200" },
  { type: "approved", name: "Rohan S.",  action: "approved delivery — ₹3,825 released",  time: "5m ago",   col: "#059669", amount: "₹3,825" },
  { type: "order",    name: "Divya K.",  action: "booked Arjun M. for YouTube edit",     time: "11m ago",  col: "var(--brand-client)", amount: "₹4,500" },
  { type: "review",   name: "Meera P.",  action: "left 5★ review — 'Delivered early!'",  time: "18m ago",  col: "#d97706", amount: null     },
  { type: "order",    name: "Karan D.",  action: "placed a thumbnail design order",      time: "24m ago",  col: "var(--brand-client)", amount: "₹800"  },
  { type: "approved", name: "Sneha R.",  action: "approved Reels package delivery",      time: "31m ago",  col: "#059669", amount: "₹1,700" },
  { type: "order",    name: "Vivek D.",  action: "booked podcast editing — 3 eps",       time: "45m ago",  col: "var(--brand-client)", amount: "₹5,400" },
  { type: "approved", name: "Priya M.",  action: "payment released after approval",      time: "1h ago",   col: "#059669", amount: "₹2,200" },
];

const TAG_CFG: Record<string, { label: string }> = {
  order:    { label: "ORDER"  },
  approved: { label: "PAID"   },
  review:   { label: "REVIEW" },
};

interface ActivityItem {
  type: string;
  name: string;
  action: string;
  time: string;
  col: string;
  amount: string | null;
}

export function AnimatedActivity({ feedItems }: { feedItems?: ActivityItem[] }) {
  const hasRealData = feedItems && feedItems.length > 0;
  const base = hasRealData ? feedItems : ACTIVITY;
  const [items, setItems] = useState(base.slice(0, 6));
  const listRef = useRef<HTMLDivElement>(null);
  const sectionRef = useRef(null);
  const sectionInView = useInView(sectionRef, { once: true, margin: "-60px" });
  const prefersReduced = useReducedMotion();

  useEffect(() => {
    if (prefersReduced || !hasRealData) return;
    const t = setInterval(() => {
      setItems(prev => {
        const newItem = base[Math.floor(Math.random() * base.length)];
        return [{ ...newItem, time: "just now" }, ...prev.slice(0, -1)];
      });
    }, 3500);
    return () => clearInterval(t);
  }, [prefersReduced, hasRealData, base]);

  return (
    <section ref={sectionRef} className="bg-white py-10 md:py-16 px-6 overflow-hidden">
      <div className="max-w-7xl mx-auto">
        <div className="grid lg:grid-cols-2 gap-12 items-center">
          {/* Left — text */}
          <Reveal className="min-w-0">
            <div className="flex items-center gap-3 mb-5">
              <div className="h-px w-10 bg-[var(--brand-client)]" />
              <span className="text-[10px] font-black text-[var(--brand-client)] uppercase tracking-[0.28em]">Live platform</span>
            </div>
            <h2 className="text-4xl sm:text-6xl font-black text-gray-900 tracking-tight leading-[1.0] mb-6">
              Orders happening<br /><span className="text-gray-200">right now.</span>
            </h2>
            <p className="text-gray-400 text-base md:text-lg leading-relaxed mb-8">
              Creators across India are booking verified editors at this very moment.
              Every rupee sits in escrow — your money moves only when you approve the work.
            </p>
            <div className="grid grid-cols-2 gap-3">
              {[
                { v: "< 2hrs", l: "Avg. first response",   c: "var(--brand-client)", Icon: Clock, delay: 0.15 },
                { v: "6",      l: "Content niches covered", c: "var(--brand-teal)", Icon: Zap,   delay: 0.28 },
              ].map(({ v, l, c, Icon, delay }) => (
                <motion.div
                  key={l}
                  initial={{ opacity: 0, y: 18 }}
                  animate={sectionInView ? { opacity: 1, y: 0 } : {}}
                  transition={{ duration: 0.6, delay, ease: [0.22, 1, 0.36, 1] }}
                  className="rounded-2xl p-5 flex flex-col gap-3"
                  style={{ background: `${c}08`, border: `1px solid ${c}22` }}
                >
                  <Icon className="w-4 h-4" style={{ color: c }} strokeWidth={1.5} />
                  <p className="text-3xl font-black leading-none" style={{ color: c }}>{v}</p>
                  <p className="text-xs font-semibold leading-snug" style={{ color: `${c}99` }}>{l}</p>
                </motion.div>
              ))}
            </div>
          </Reveal>

          {/* Right — live feed */}
          <Reveal from="right" className="min-w-0">
            <div className="relative rounded-3xl overflow-hidden border border-gray-100 shadow-[0_32px_80px_rgba(0,0,0,0.08)]">

              {/* Header */}
              <div className="bg-white border-b border-gray-100 px-5 py-4 flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <span className="relative flex h-2 w-2 shrink-0">
                    <motion.span
                      className="absolute inline-flex h-full w-full rounded-full bg-emerald-400"
                      animate={{ scale: [1, 2.4, 1], opacity: [0.7, 0, 0.7] }}
                      transition={{ duration: 2, repeat: Infinity, ease: "easeOut" }}
                    />
                    <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500" />
                  </span>
                  <span className="text-sm font-bold text-gray-900">Live activity</span>
                </div>
                <span className="text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-100 rounded-full px-2.5 py-0.5">
                  {hasRealData ? "Last 24h" : "Updated live"}
                </span>
              </div>

              {/* Feed */}
              <div ref={listRef} className="bg-gray-50/30 divide-y divide-gray-100/80" style={{ maxHeight: 372, overflow: "hidden" }}>
                <AnimatePresence initial={false}>
                  {items.slice(0, 6).map((item, i) => {
                    const tag = TAG_CFG[item.type];
                    const rightVal = item.amount ?? (item.type === "review" ? "★ 5.0" : null);
                    const rightCol = item.amount ? item.col : "#d97706";
                    const isNew = item.time === "just now";
                    return (
                      <motion.div
                        key={`${item.name}-${item.time}-${i}`}
                        initial={{ opacity: 0, x: isNew ? -20 : 0, height: isNew ? 0 : "auto" }}
                        animate={{ opacity: 1, x: 0, height: "auto" }}
                        exit={{ opacity: 0, height: 0 }}
                        transition={{
                          duration: isNew ? 0.38 : 0.45,
                          delay: isNew ? 0 : i * 0.065,
                          ease: [0.22, 1, 0.36, 1],
                        }}
                        className={cn(
                          "flex items-center gap-3.5 px-5 py-3.5 transition-colors duration-500",
                          isNew && "bg-emerald-50/70"
                        )}
                      >
                        {/* Avatar */}
                        <div
                          className="w-8 h-8 rounded-full flex items-center justify-center text-[10px] font-black text-white shrink-0 ring-2 ring-white"
                          style={{ background: item.col }}
                        >
                          {item.name.split(" ").map((w: string) => w[0]).join("")}
                        </div>

                        {/* Content */}
                        <div className="flex-1 min-w-0">
                          <p className="text-xs text-gray-600 truncate leading-snug">
                            <span className="font-semibold text-gray-900">{item.name}</span>{" "}{item.action}
                          </p>
                          <div className="flex items-center gap-1.5 mt-1">
                            <span className="text-[10px] text-gray-400">{item.time}</span>
                            {tag && (
                              <span
                                className="text-[8px] font-black uppercase tracking-widest rounded px-1.5 py-0.5 leading-none"
                                style={{ background: `${item.col}14`, color: item.col }}
                              >
                                {tag.label}
                              </span>
                            )}
                          </div>
                        </div>

                        {/* Right badge */}
                        {rightVal && (
                          <motion.span
                            className="text-xs font-bold shrink-0 rounded-md px-1.5 py-0.5 tabular-nums"
                            style={{ color: rightCol }}
                            initial={isNew ? { scale: 1.2, backgroundColor: `${rightCol}28` } : false}
                            animate={{ scale: 1, backgroundColor: "rgba(0,0,0,0)" }}
                            transition={{ duration: 0.9, ease: "easeOut" }}
                          >
                            {rightVal}
                          </motion.span>
                        )}
                      </motion.div>
                    );
                  })}
                </AnimatePresence>
              </div>

              {/* Footer */}
              <div className="bg-white border-t border-gray-100 px-5 py-3 flex items-center justify-between">
                <span className="text-[11px] text-gray-400">
                  {hasRealData ? "Showing live order activity" : "Every order is escrow-protected"}
                </span>
                <span className="text-[11px] text-[var(--brand-client)] font-semibold">Payments verified & protected</span>
              </div>
            </div>
          </Reveal>
        </div>
      </div>
    </section>
  );
}

/* ════════════════════════════════════════════════════════════════════════════
   HOW IT WORKS — dark, sticky mockup
════════════════════════════════════════════════════════════════════════════ */
const STEPS = [
  { n: "01", icon: FileCheck,     title: "Browse verified editors",  desc: "Filter by niche, delivery time, and price. Every profile is KYC-approved before they can accept a single order.",        accent: "#7c6ff7", pill: "KYC verified only"      },
  { n: "02", icon: Lock,          title: "Pay with full protection",  desc: "Your payment is held securely — never released to the editor until you explicitly approve the delivered work.",            accent: "#38bdf8", pill: "₹0 risk to you"         },
  { n: "03", icon: MessageSquare, title: "Collaborate in real time",  desc: "Share your brief, send reference clips, and give feedback — all inside EditBridge. No WhatsApp threads, no lost files.", accent: "#34d399", pill: "Everything in one place" },
  { n: "04", icon: CheckCircle,   title: "Approve & download",        desc: "Happy with the result? Approve and your files download instantly. Need tweaks? Every package includes revision rounds.",  accent: "#fbbf24", pill: "Revisions included"      },
];

const MOCKUP_CONTENT = [
  // 01 Browse
  <div key="browse" className="p-5 space-y-3">
    <div className="flex items-center justify-between mb-1">
      <p className="text-xs font-bold text-gray-900">Find your editor</p>
      <span className="text-[10px] text-gray-400">24 editors available</span>
    </div>
    <div className="flex gap-1.5 mb-3 flex-wrap">
      {["All","YouTube","Reels","Podcasts","Thumbnails"].map((t,i) => (
        <span key={t} className={cn("text-[10px] font-semibold rounded-full px-2.5 py-1", i===0?"bg-[#7c6ff7] text-white":"bg-white border border-gray-200 text-gray-500")}>{t}</span>
      ))}
    </div>
    {[
      {init:"AM",name:"Arjun Mehta",role:"YouTube Long-form",r:4.9,rev:8,p:"₹3,500",col:"var(--brand-editor)",del:"3 days"},
      {init:"PS",name:"Priya Sharma",role:"Thumbnails & Branding",r:5.0,rev:5,p:"₹1,200",col:"#059669",del:"1 day"},
      {init:"RK",name:"Rahul Kumar",role:"Reels & Short-form",r:4.8,rev:11,p:"₹2,000",col:"#ea580c",del:"2 days"},
    ].map((e,i) => (
      <motion.div key={e.name} initial={{opacity:0,y:8}} animate={{opacity:1,y:0}} transition={{delay:i*0.1}}
        className={cn("flex items-center gap-3 p-3 rounded-xl border transition-colors shadow-sm", i===0?"bg-[#7c6ff7]/5 border-[#7c6ff7]/20":"bg-white border-gray-100")}>
        <div className="w-9 h-9 rounded-xl flex items-center justify-center text-white text-[9px] font-black shrink-0" style={{background:e.col}}>{e.init}</div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1 mb-0.5"><p className="text-xs font-bold text-gray-900 truncate">{e.name}</p><ShieldCheck className="w-3 h-3 text-[#7c6ff7] shrink-0"/></div>
          <p className="text-[10px] text-gray-400">{e.role} · {e.del} delivery</p>
        </div>
        <div className="text-right shrink-0">
          <p className="text-xs font-bold text-gray-900">{e.p}</p>
          <div className="flex items-center gap-0.5 justify-end mt-0.5">
            <Star className="w-2.5 h-2.5 text-amber-400 fill-amber-400"/>
            <span className="text-[10px] text-gray-400">{e.r} ({e.rev})</span>
          </div>
        </div>
      </motion.div>
    ))}
  </div>,

  // 02 Pay
  <div key="checkout" className="p-5 space-y-3">
    <div className="flex items-center gap-2 mb-1">
      <div className="w-7 h-7 rounded-lg bg-[var(--brand-editor)] flex items-center justify-center text-white text-[9px] font-black">AM</div>
      <div><p className="text-xs font-bold text-gray-900">Arjun Mehta</p><p className="text-[10px] text-gray-400">YouTube Edit — Pro Package</p></div>
    </div>
    <div className="bg-gray-50 rounded-xl p-4 border border-gray-100 space-y-2.5">
      <div className="flex justify-between items-center"><span className="text-xs text-gray-500">Package price</span><span className="text-sm font-bold text-gray-900">₹4,500</span></div>
      <div className="flex justify-between items-center"><span className="text-xs text-gray-400">Platform fee (4%)</span><span className="text-xs text-gray-400">₹180</span></div>
      <div className="h-px bg-gray-200" />
      <div className="flex justify-between items-center"><span className="text-xs font-bold text-gray-900">Total charged</span><span className="text-base font-black text-gray-900">₹4,680</span></div>
    </div>
    <div className="flex items-start gap-2.5 bg-sky-50 border border-sky-100 rounded-xl p-3">
      <Lock className="w-4 h-4 text-sky-500 mt-0.5 shrink-0"/>
      <div>
        <p className="text-sky-800 text-[11px] font-semibold">Payment held — not released yet</p>
        <p className="text-sky-500 text-[10px] mt-0.5">Released to editor only after you approve</p>
      </div>
    </div>
    <motion.div animate={{boxShadow:["0 0 0 rgba(124,111,247,0)","0 0 20px rgba(124,111,247,0.5)","0 0 0 rgba(124,111,247,0)"]}} transition={{duration:2,repeat:Infinity}}
      className="bg-[#7c6ff7] text-white text-xs font-bold rounded-xl py-3 text-center cursor-pointer">
      Pay ₹4,680 with Razorpay →
    </motion.div>
  </div>,

  // 03 Collaborate
  <div key="chat" className="p-5">
    <div className="flex items-center gap-2.5 pb-3 mb-3 border-b border-gray-100">
      <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-violet-500 to-purple-700 flex items-center justify-center text-white text-[9px] font-black">AM</div>
      <div className="flex-1">
        <p className="text-xs font-bold text-gray-900">Arjun Mehta</p>
        <div className="flex items-center gap-1"><motion.span animate={{opacity:[1,0.3,1]}} transition={{duration:1.4,repeat:Infinity}} className="w-1.5 h-1.5 rounded-full bg-emerald-400 inline-block"/><span className="text-[10px] text-emerald-600">Online now</span></div>
      </div>
      <span className="text-[10px] text-gray-400 bg-gray-50 border border-gray-100 rounded-full px-2 py-0.5">Order #EB-0042</span>
    </div>
    <div className="space-y-2.5 mb-3">
      {[
        {from:"them",msg:"Brief received! Starting with the intro sequence now."},
        {from:"me",  msg:"Great! Add jump cuts at the 2:30 mark please."},
        {from:"them",msg:"On it. I'll send a preview by 4pm today 👍"},
        {from:"me",  msg:"Perfect. Also keep the color grade warm."},
      ].map((c,i)=>(
        <motion.div key={i} initial={{opacity:0,y:5}} animate={{opacity:1,y:0}} transition={{delay:i*0.1}}
          className={cn("flex",c.from==="me"?"justify-end":"")}>
          <div className={cn("max-w-[78%] rounded-2xl px-3 py-2 text-[11px] leading-relaxed",c.from==="me"?"bg-[#7c6ff7] text-white rounded-br-sm":"bg-gray-100 text-gray-700 rounded-bl-sm")}>{c.msg}</div>
        </motion.div>
      ))}
    </div>
    <div className="flex items-center gap-2 bg-gray-50 border border-gray-100 rounded-xl px-3 py-2">
      <span className="text-[10px] text-gray-300 flex-1">Reply to Arjun…</span>
      <div className="w-5 h-5 rounded-lg bg-[#7c6ff7] flex items-center justify-center">
        <ArrowRight className="w-2.5 h-2.5 text-white"/>
      </div>
    </div>
  </div>,

  // 04 Approve
  <div key="delivery" className="p-5 space-y-3">
    <motion.div initial={{scale:0.9,opacity:0}} animate={{scale:1,opacity:1}} transition={{duration:0.4,ease:[0.22,1,0.36,1]}}
      className="flex items-center gap-3 p-4 bg-emerald-50 border border-emerald-100 rounded-xl">
      <div className="w-10 h-10 rounded-xl bg-emerald-100 flex items-center justify-center shrink-0">
        <CheckCircle className="w-5 h-5 text-emerald-600"/>
      </div>
      <div>
        <p className="text-emerald-800 font-bold text-sm">Arjun delivered your files!</p>
        <p className="text-emerald-500 text-[10px] mt-0.5">Auto-approves in 7 days if no action taken</p>
      </div>
    </motion.div>
    <div className="bg-gray-50 rounded-xl border border-gray-100 overflow-hidden">
      <p className="text-[11px] font-semibold text-gray-500 px-4 pt-3 pb-2 border-b border-gray-100">Delivered files</p>
      {["YouTube_Final_v2.mp4","Project_Source_Files.zip","Color_LUTs.zip"].map((f,i)=>(
        <motion.div key={f} initial={{opacity:0,x:-8}} animate={{opacity:1,x:0}} transition={{delay:i*0.1}}
          className="flex items-center gap-2.5 px-4 py-2.5 border-b border-gray-50 last:border-0">
          <div className="w-6 h-6 rounded-lg bg-gray-100 flex items-center justify-center shrink-0"><Package className="w-3 h-3 text-gray-400"/></div>
          <span className="text-gray-700 text-[11px] font-mono flex-1 truncate">{f}</span>
          <span className="text-[9px] text-[#7c6ff7] font-semibold">↓</span>
        </motion.div>
      ))}
    </div>
    <div className="flex gap-2">
      <div className="flex-1 border border-gray-200 rounded-xl py-2.5 text-[11px] font-medium text-gray-500 text-center cursor-pointer hover:bg-gray-50 transition-colors">Request revision</div>
      <motion.div animate={{boxShadow:["0 0 0 rgba(5,150,105,0)","0 0 18px rgba(5,150,105,0.45)","0 0 0 rgba(5,150,105,0)"]}} transition={{duration:2,repeat:Infinity}}
        className="flex-1 bg-emerald-600 text-white rounded-xl py-2.5 text-[11px] font-bold text-center cursor-pointer">
        ✓ Approve & release payment
      </motion.div>
    </div>
  </div>,
];

export function AnimatedHowItWorks() {
  const [active, setActive] = useState(0);
  const sectionRef = useRef<HTMLDivElement>(null);
  const { scrollYProgress } = useScroll({ target: sectionRef, offset: ["start 0.7", "end 0.3"] });
  useEffect(() => scrollYProgress.on("change", v => setActive(Math.min(STEPS.length - 1, Math.floor(v * STEPS.length)))), [scrollYProgress]);

  return (
    <section ref={sectionRef} className="relative bg-[#06040f] py-10 md:py-16 px-6 overflow-hidden">
      {/* Grid */}
      <div className="absolute inset-0 opacity-[0.04]" style={{backgroundImage:`linear-gradient(rgba(255,255,255,0.6) 1px,transparent 1px),linear-gradient(90deg,rgba(255,255,255,0.6) 1px,transparent 1px)`,backgroundSize:"48px 48px"}} />
      {/* Glow blobs */}
      <div className="absolute top-0 left-1/4 w-96 h-96 rounded-full blur-[120px] opacity-20 pointer-events-none" style={{background:"#7c6ff7"}}/>
      <div className="absolute bottom-0 right-1/4 w-72 h-72 rounded-full blur-[100px] opacity-10 pointer-events-none" style={{background:"#34d399"}}/>

      <div className="relative z-10 max-w-7xl mx-auto">

        {/* Header */}
        <Reveal className="mb-10">
          <div className="flex items-center gap-3 mb-6">
            <div className="h-px w-8 bg-[#7c6ff7]"/>
            <span className="text-[10px] font-black text-[#7c6ff7] uppercase tracking-[0.28em]">How it works</span>
            <div className="h-px w-8 bg-[#7c6ff7]/30"/>
          </div>
          <h2 className="text-5xl sm:text-7xl font-black text-white tracking-tight leading-[0.95]">
            From browse<br />
            <span className="text-transparent bg-clip-text" style={{backgroundImage:"linear-gradient(135deg,#7c6ff7,#34d399)"}}>to delivered.</span>
          </h2>
          <p className="text-white/55 text-lg mt-5 max-w-md leading-relaxed">Four simple steps. No confusion, no surprises.</p>
        </Reveal>

        <div className="grid lg:grid-cols-2 gap-16 items-start">

          {/* Steps — vertical timeline */}
          <div className="relative">
            {/* Connector line */}
            <div className="absolute left-[22px] top-10 bottom-10 w-px bg-white/[0.06] hidden sm:block" />
            <motion.div className="absolute left-[22px] top-10 w-px origin-top hidden sm:block"
              style={{ height: `${(active / (STEPS.length - 1)) * 100}%`, background: "linear-gradient(to bottom,#7c6ff7,#34d399)", transition: "height 0.6s cubic-bezier(0.22,1,0.36,1)" }} />

            <div className="space-y-2">
              {STEPS.map(({ n, icon: Icon, title, desc, accent, pill }, i) => {
                const isActive = active === i;
                const isDone   = i < active;
                return (
                  <Reveal key={n} delay={i * 0.08}>
                    <motion.div onClick={() => setActive(i)} whileTap={{ scale: 0.985 }}
                      className="relative flex gap-5 p-5 rounded-2xl cursor-pointer transition-all overflow-hidden group"
                      animate={{ backgroundColor: isActive ? "rgba(124,111,247,0.07)" : "rgba(0,0,0,0)" }}>

                      {isActive && (
                        <motion.div layoutId="step-border" className="absolute inset-0 rounded-2xl pointer-events-none"
                          style={{ border: `1px solid ${accent}30` }} />
                      )}

                      {/* Step number circle */}
                      <div className="shrink-0 relative z-10 mt-0.5">
                        <motion.div animate={{ background: isActive ? accent : isDone ? "#1e1b4b" : "rgba(255,255,255,0.04)" }}
                          className="w-11 h-11 rounded-full flex items-center justify-center border transition-all"
                          style={{ borderColor: isActive ? `${accent}60` : isDone ? "#0EA5E960" : "rgba(255,255,255,0.08)" }}>
                          {isDone
                            ? <CheckCircle className="w-4 h-4 text-[#7c6ff7]" />
                            : <Icon className="w-4 h-4" style={{ color: isActive ? "white" : "rgba(255,255,255,0.2)" }} />
                          }
                        </motion.div>
                      </div>

                      {/* Content */}
                      <div className="flex-1 min-w-0 pt-1">
                        <div className="flex items-center gap-2.5 mb-1.5 flex-wrap">
                          <span className="text-[10px] font-black tracking-widest" style={{ color: isActive ? accent : "rgba(255,255,255,0.15)" }}>{n}</span>
                          <h3 className="text-base font-bold leading-tight transition-colors" style={{ color: isActive ? "white" : "rgba(255,255,255,0.25)" }}>{title}</h3>
                          {isActive && (
                            <motion.span initial={{ opacity: 0, scale: 0.85 }} animate={{ opacity: 1, scale: 1 }}
                              className="text-[9px] font-bold px-2 py-0.5 rounded-full border"
                              style={{ color: accent, borderColor: `${accent}40`, background: `${accent}12` }}>
                              {pill}
                            </motion.span>
                          )}
                        </div>
                        <motion.p animate={{ opacity: isActive ? 0.65 : 0.30 }} transition={{ duration: 0.3 }}
                          className="text-white text-sm leading-relaxed">
                          {desc}
                        </motion.p>
                      </div>

                      {/* Progress bar on active */}
                      {isActive && (
                        <motion.div key={active} initial={{ scaleX: 0 }} animate={{ scaleX: 1 }}
                          transition={{ duration: 6, ease: "linear" }}
                          className="absolute bottom-0 left-14 right-5 h-0.5 rounded-full origin-left"
                          style={{ background: `linear-gradient(90deg,${accent},transparent)` }} />
                      )}
                    </motion.div>
                  </Reveal>
                );
              })}
            </div>

            {/* Step counter */}
            <div className="mt-8 ml-16 flex items-center gap-3">
              {STEPS.map((_, i) => (
                <button key={i} onClick={() => setActive(i)}
                  className="transition-all rounded-full"
                  style={{ width: active === i ? 24 : 6, height: 6, background: active === i ? STEPS[i].accent : "rgba(255,255,255,0.12)" }} />
              ))}
              <span className="text-white/20 text-[11px] font-semibold ml-1">Step {active + 1} of {STEPS.length}</span>
            </div>
          </div>

          {/* Sticky mockup */}
          <div className="hidden lg:block">
            <div className="sticky top-28">
              {/* Glow ring around mockup */}
              <div className="absolute -inset-4 rounded-3xl blur-2xl opacity-20 pointer-events-none transition-all duration-700"
                style={{ background: STEPS[active].accent }} />
              <div className="relative rounded-2xl overflow-hidden shadow-[0_48px_120px_rgba(0,0,0,0.7)]"
                style={{ background: "linear-gradient(white,white) padding-box, linear-gradient(135deg,rgba(124,111,247,0.5),rgba(52,211,153,0.2)) border-box", border: "1px solid transparent" }}>
                {/* Browser chrome */}
                <div className="bg-gray-50 border-b border-gray-100 px-4 py-2.5 flex items-center gap-2">
                  <div className="flex gap-1.5">{["#ff5f57","#febc2e","#28c840"].map(c=><div key={c} className="w-2.5 h-2.5 rounded-full" style={{background:c}}/>)}</div>
                  <div className="flex-1 bg-white border border-gray-100 rounded-md px-3 py-1 flex items-center gap-1.5 mx-2">
                    <Lock className="w-2.5 h-2.5 text-gray-300"/>
                    <span className="text-[10px] text-gray-400 font-mono">editbridge.in/{["browse","checkout","messages","order"][active]}</span>
                  </div>
                  {/* Step dots in chrome */}
                  <div className="flex gap-1">
                    {STEPS.map((_,i) => (
                      <div key={i} className="w-1.5 h-1.5 rounded-full transition-all" style={{ background: i === active ? STEPS[active].accent : "rgba(0,0,0,0.1)" }} />
                    ))}
                  </div>
                </div>
                <AnimatePresence mode="wait">
                  <motion.div key={active} initial={{opacity:0,y:14}} animate={{opacity:1,y:0}} exit={{opacity:0,y:-14}} transition={{duration:0.4,ease:[0.22,1,0.36,1]}}>
                    {MOCKUP_CONTENT[active]}
                  </motion.div>
                </AnimatePresence>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

/* ════════════════════════════════════════════════════════════════════════════
   EDITOR SPOTLIGHT (light)
════════════════════════════════════════════════════════════════════════════ */
interface RealEditor {
  id: string;
  name: string;
  displayName: string | null;
  niche: string | null;
  title: string | null;
  location: string | null;
  totalOrders: number;
  isFeatured: boolean | null;
  minPrice: number | null;
  minDeliveryDays: number | null;
  avgRating: number | null;
  reviewCount: number;
  skills: string[];
  image?: string | null;
  thumbnailUrl?: string | null;
  videoUrl?: string | null;
  activeFrame?: string | null;
  hasHighlight?: boolean;
}

const EDITORS = [
  { name: "Arjun Mehta",  initials: "AM", role: "YouTube Long-form",      loc: "Mumbai",    rating: 4.9, reviews: 8,  price: "₹3,500", time: "3 days", col: "var(--brand-editor)", badge: "KYC Verified",  badgeCls: "bg-amber-50 text-amber-700 border-amber-200",     skills: ["Premiere Pro","Color Grading","After Effects"],   orders: 12 },
  { name: "Priya Sharma", initials: "PS", role: "Thumbnails & Branding",  loc: "Bangalore", rating: 5.0, reviews: 5,  price: "₹1,200", time: "1 day",  col: "#059669", badge: "KYC Verified",  badgeCls: "bg-emerald-50 text-emerald-700 border-emerald-200",skills: ["Photoshop","Canva Pro","Typography"],              orders: 9   },
  { name: "Rahul Kumar",  initials: "RK", role: "Reels & Short-form",     loc: "Delhi",     rating: 4.8, reviews: 11, price: "₹2,000", time: "2 days", col: "#ea580c", badge: "Fast Delivery", badgeCls: "bg-blue-50 text-blue-700 border-blue-200",        skills: ["CapCut","Motion Graphics","Sound Design"],        orders: 15 },
  { name: "Nisha Patel",  initials: "NP", role: "Corporate & Brand Ads",  loc: "Ahmedabad", rating: 4.7, reviews: 6,  price: "₹5,000", time: "5 days", col: "#2563eb", badge: "KYC Verified",  badgeCls: "bg-violet-50 text-violet-700 border-violet-200",  skills: ["DaVinci","After Effects","VFX"],                  orders: 7   },
  { name: "Vivek Das",    initials: "VD", role: "Podcast Editing",        loc: "Chennai",   rating: 4.9, reviews: 9,  price: "₹1,800", time: "2 days", col: "#db2777", badge: "KYC Verified",  badgeCls: "bg-rose-50 text-rose-700 border-rose-200",        skills: ["Audacity","Descript","Premiere Pro"],             orders: 11 },
];

const EDITOR_FILTERS = [
  { label: "All",        terms: [] as string[] },
  { label: "YouTube",    terms: ["youtube", "long-form", "longform"] },
  { label: "Reels",      terms: ["reels", "shorts", "short-form", "shortform"] },
  { label: "Thumbnails", terms: ["thumbnail", "design", "branding"] },
  { label: "Corporate",  terms: ["corporate", "brand", "commercial", "ads"] },
  { label: "Podcast",    terms: ["podcast", "audio"] },
];

export function AnimatedEditorCards({ editors: realEditors }: { editors?: RealEditor[] }) {
  const [activeFilter, setActiveFilter] = useState("All");

  const allEditors = realEditors && realEditors.length > 0
    ? realEditors
        .map((e, i) => ({
          name: e.displayName ?? e.name,
          image: e.image ?? null,
          initials: (e.displayName ?? e.name).split(" ").map((n: string) => n[0]).join("").slice(0, 2).toUpperCase(),
          role: (() => { const n = e.niche; if (!n) return e.title ?? "Video Editor"; try { const p = JSON.parse(n); return Array.isArray(p) ? p[0] : n; } catch { return n; } })(),
          loc: e.location ?? "India",
          rating: e.avgRating ?? 5.0,
          reviews: e.reviewCount,
          price: e.minPrice ? `₹${Math.round(e.minPrice / 100).toLocaleString("en-IN")}` : "₹1,500",
          time: e.minDeliveryDays ? `${e.minDeliveryDays} day${e.minDeliveryDays === 1 ? "" : "s"}` : "3 days",
          col: (["var(--brand-editor)","#059669","#ea580c","#2563eb","#db2777"] as string[])[i % 5],
          isFeatured: e.isFeatured,
          skills: (e.skills ?? []).slice(0, 3),
          orders: e.totalOrders,
          href: `/editor/${e.id}`,
          thumbnailUrl: e.thumbnailUrl ?? null,
          videoUrl: e.videoUrl ?? null,
          activeFrame: e.activeFrame ?? null,
          hasHighlight: e.hasHighlight ?? false,
        }))
        .filter(e => e.skills.length > 0) // hide incomplete/test accounts
    : EDITORS.map(e => ({ ...e, image: null, isFeatured: false, thumbnailUrl: null, videoUrl: null, activeFrame: null, hasHighlight: false }));

  const filteredEditors = activeFilter === "All"
    ? allEditors
    : allEditors.filter(e => {
        const text = `${e.role} ${e.skills.join(" ")}`.toLowerCase();
        const terms = EDITOR_FILTERS.find(f => f.label === activeFilter)?.terms ?? [];
        return terms.some(t => text.includes(t));
      });

  return (
    <section className="bg-white py-10 md:py-16 px-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex items-end justify-between mb-10 flex-wrap gap-6">
          <Reveal>
            <div className="flex items-center gap-3 mb-5">
              <div className="h-px w-10 bg-[var(--brand-client)]"/>
              <span className="text-[10px] font-black text-[var(--brand-client)] uppercase tracking-[0.28em]">Our editors</span>
            </div>
            <h2 className="text-4xl sm:text-6xl font-black text-gray-900 tracking-tight leading-none">
              Verified talent.<br /><span className="text-gray-200">Ready now.</span>
            </h2>
          </Reveal>
          <Link href="/browse" className="inline-flex items-center gap-2 border border-gray-200 text-gray-500 hover:text-[var(--brand-client)] hover:border-[var(--brand-client)]/30 text-sm font-medium px-5 py-2.5 rounded-xl transition-all">
            All editors <ArrowUpRight className="w-4 h-4"/>
          </Link>
        </div>

        {/* Filter tabs */}
        <div className="flex items-center gap-2 flex-wrap mb-8">
          {EDITOR_FILTERS.map(({ label }) => (
            <button key={label} onClick={() => setActiveFilter(label)}
              className={cn(
                "text-xs font-semibold px-4 py-2 rounded-full border transition-all",
                activeFilter === label
                  ? "bg-[var(--brand-client)] text-white border-[var(--brand-client)] shadow-sm"
                  : "bg-white text-gray-500 border-gray-200 hover:border-[var(--brand-client)]/40 hover:text-[var(--brand-client)]"
              )}>
              {label}
            </button>
          ))}
        </div>

        {/* 3-column grid */}
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
          <AnimatePresence mode="popLayout">
            {filteredEditors.map((e, i) => {
              const editorHref = (e as { href?: string }).href ?? "/browse";
              return (
                <motion.div key={e.name}
                  layout
                  initial={{ opacity: 0, y: 24 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.95 }}
                  transition={{ delay: i * 0.06, duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
                  className={cn(
                    "group relative rounded-2xl border bg-white hover:shadow-xl transition-all duration-300 overflow-hidden flex flex-col",
                    e.hasHighlight
                      ? "border-sky-400 ring-2 ring-sky-100/50 shadow-sky-100"
                      : "border-gray-100 hover:border-gray-200"
                  )}
                  style={{ boxShadow: e.hasHighlight ? "0 4px 20px rgba(14,165,233,0.06)" : "0 2px 12px rgba(0,0,0,0.04)" }}
                >
                  {/* Visual Preview Header (16:9 ratio) */}
                  <div className="relative aspect-video w-full bg-gray-50 border-b border-gray-100 overflow-hidden flex items-center justify-center shrink-0">
                    <PortfolioPreview
                      videoUrl={(e as any).videoUrl}
                      thumbnailUrl={(e as any).thumbnailUrl}
                      altText={e.name}
                    />
                  </div>

                  {/* Card header gradient */}
                  <div className="relative px-6 pt-6 pb-5 overflow-hidden"
                    style={{ background: `linear-gradient(135deg, ${e.col}08 0%, ${e.col}02 100%)` }}>
                    <div className="absolute top-0 right-0 w-32 h-32 rounded-full blur-2xl opacity-20 pointer-events-none" style={{ background: e.col }} />
                    {/* Avatar + badge row */}
                    <div className="relative flex items-start justify-between mb-4">
                      <div className="relative w-14 h-14 rounded-2xl flex items-center justify-center text-white font-black text-lg shadow-lg overflow-hidden shrink-0"
                        style={{
                          background: `linear-gradient(135deg, ${e.col}dd, ${e.col}99)`,
                          boxShadow: e.activeFrame && FRAME_STYLES[e.activeFrame as FrameKey] ? FRAME_STYLES[e.activeFrame as FrameKey] : undefined
                        }}>
                        {e.image ? (
                          <img src={e.image} alt={e.name} className="w-full h-full object-cover" />
                        ) : (
                          e.initials
                        )}
                      </div>
                      {e.isFeatured
                        ? <span className="text-[9px] font-bold bg-amber-50 text-amber-700 border border-amber-200 rounded-full px-2.5 py-1">Featured</span>
                        : <span className="text-[9px] font-bold bg-[var(--brand-client)]/8 text-[var(--brand-client)] border border-[var(--brand-client)]/20 rounded-full px-2.5 py-1 flex items-center gap-1">
                            <ShieldCheck className="w-2.5 h-2.5" /> KYC Verified
                          </span>
                      }
                    </div>
                    <h3 className="font-black text-gray-900 text-lg leading-tight mb-0.5">{e.name}</h3>
                    <p className="text-sm text-gray-500 mb-2">{e.role}</p>
                    <div className="flex items-center gap-3">
                      <div className="flex items-center gap-1">
                        <Star className="w-3 h-3 fill-amber-400 text-amber-400" />
                        <span className="text-xs font-bold text-gray-700">{e.rating.toFixed(1)}</span>
                        {e.reviews > 0 && <span className="text-xs text-gray-400">({e.reviews})</span>}
                      </div>
                      <span className="text-gray-200">·</span>
                      <span className="text-xs text-gray-400">{e.loc}</span>
                    </div>
                  </div>

                  {/* Skills */}
                  <div className="px-6 py-4 flex flex-wrap gap-1.5 border-b border-gray-50">
                    {e.skills.map(s => (
                      <span key={s} className="text-[11px] font-medium bg-gray-50 text-gray-500 rounded-lg px-2.5 py-1">{s}</span>
                    ))}
                  </div>

                  {/* Stats row */}
                  <div className="px-6 py-4 flex items-center gap-4 border-b border-gray-50">
                    <div className="flex items-center gap-1.5 text-xs text-gray-500">
                      <Package className="w-3.5 h-3.5 text-gray-300" />
                      {e.orders > 0 ? `${e.orders} orders` : <span className="text-gray-300">New</span>}
                    </div>
                    <span className="text-gray-200">·</span>
                    <div className="flex items-center gap-1.5 text-xs text-gray-500">
                      <Clock className="w-3.5 h-3.5 text-gray-300" />
                      {e.time} delivery
                    </div>
                  </div>

                  {/* Price + CTA */}
                  <div className="px-6 py-5 flex items-center justify-between mt-auto">
                    <div>
                      <p className="text-[10px] text-gray-400 font-medium mb-0.5">Starting from</p>
                      <p className="text-xl font-black text-gray-900">{e.price}</p>
                    </div>
                    <Link href={editorHref}
                      className="inline-flex items-center gap-1.5 text-white text-sm font-bold px-4 py-2.5 rounded-xl transition-all hover:opacity-90 hover:scale-[1.03]"
                      style={{ background: e.col, boxShadow: `0 6px 20px ${e.col}40` }}>
                      Book now <ArrowRight className="w-3.5 h-3.5" />
                    </Link>
                  </div>
                </motion.div>
              );
            })}

            {/* CTA card — always shown as the last card */}
            <motion.div key="cta-card"
              layout
              initial={{ opacity: 0, y: 24 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: filteredEditors.length * 0.06, duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
              className="relative rounded-2xl border-2 border-dashed border-gray-200 bg-gray-50/50 hover:border-[var(--brand-client)]/40 hover:bg-[var(--brand-client)]/3 transition-all duration-300 overflow-hidden flex flex-col items-center justify-center text-center p-8 min-h-[300px] group"
            >
              <div className="w-14 h-14 rounded-2xl bg-[var(--brand-client)]/10 flex items-center justify-center mb-4 group-hover:bg-[var(--brand-client)]/15 transition-colors">
                <ArrowUpRight className="w-6 h-6 text-[var(--brand-client)]" />
              </div>
              <h3 className="font-black text-gray-800 text-lg mb-2">Become a verified editor</h3>
              <p className="text-sm text-gray-400 mb-6 leading-relaxed max-w-[200px]">
                Join EditBridge, get KYC verified, and start earning from clients across India.
              </p>
              <Link href="/signup/editor"
                className="inline-flex items-center gap-2 bg-[var(--brand-client)] text-white text-sm font-bold px-5 py-2.5 rounded-xl hover:opacity-90 hover:scale-[1.02] transition-all"
                style={{ boxShadow: "0 6px 20px rgba(14,165,233,0.35)" }}>
                Apply now <ArrowRight className="w-3.5 h-3.5" />
              </Link>
            </motion.div>
          </AnimatePresence>
        </div>

        {/* View all */}
        <div className="mt-10 flex justify-center">
          <Link href="/browse" className="inline-flex items-center gap-2 border border-[var(--brand-client)]/30 text-[var(--brand-client)] hover:bg-[var(--brand-client)]/5 font-semibold px-6 py-3 rounded-xl text-sm transition-all">
            View all 100+ editors <ArrowRight className="w-4 h-4" />
          </Link>
        </div>
      </div>
    </section>
  );
}

/* ════════════════════════════════════════════════════════════════════════════
   BEFORE → AFTER TRANSFORMATION
════════════════════════════════════════════════════════════════════════════ */
const AFTER_WAVEFORM = Array.from({ length: 40 }, (_, i) => Math.round(30 + Math.sin(i * 0.8) * 25 + Math.cos(i * 1.3) * 20));
const BEFORE_WAVEFORM = Array.from({ length: 40 }, (_, i) => Math.round(10 + Math.abs(Math.sin(i * 2.1)) * 40 + (i % 5 === 0 ? 30 : 0)));

const BA_TABS = [
  { label: "YouTube Long-form",  file: "YouTube_Final_v3.prproj",  lut: "CINEMATIC WARM", col: "var(--brand-client)", before: "Raw vlog footage · flat color · no cuts",  after: "Color graded · jump cuts · motion titles" },
  { label: "Instagram Reels",   file: "Reels_v2_Final.prproj",     lut: "VIVID MOBILE",   col: "var(--brand-editor)", before: "Vertical raw clip · no music sync",          after: "Beat-synced cuts · transitions · captions" },
  { label: "Podcast Edit",      file: "Podcast_EP23_Clean.prproj", lut: "CLEAN VOICE",    col: "var(--brand-teal)", before: "Raw recording · filler words · background noise", after: "Noise removed · chapter marks · waveform eq" },
];

export function BeforeAfterSection() {
  const [tab, setTab] = useState(0);
  const [pct, setPct] = useState(48);
  const [dragging, setDragging] = useState(false);
  const [hinted, setHinted] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const sectionRef = useRef<HTMLDivElement>(null);
  const sectionInView = useInView(sectionRef, { once: true, margin: "-100px" });
  const prefersReducedBA = useReducedMotion();
  const activeTab = BA_TABS[tab];
  useEffect(() => {
    if (!sectionInView || hinted || prefersReducedBA) return;
    const t = setTimeout(() => setHinted(true), 900);
    return () => clearTimeout(t);
  }, [sectionInView, hinted, prefersReducedBA]);

  function moveTo(clientX: number) {
    if (!containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    const x = Math.max(5, Math.min(95, ((clientX - rect.left) / rect.width) * 100));
    setPct(Math.round(x));
  }

  return (
    <section ref={sectionRef} className="bg-gray-950 py-10 md:py-16 px-6 overflow-hidden relative">
      <div className="absolute inset-0 opacity-[0.03]" style={{ backgroundImage: "radial-gradient(rgba(255,255,255,0.6) 1px, transparent 1px)", backgroundSize: "32px 32px" }} />
      <div className="relative max-w-6xl mx-auto">
        <Reveal className="text-center mb-10">
          <div className="flex items-center justify-center gap-3 mb-5">
            <div className="h-px w-10 bg-[var(--brand-editor)]" />
            <span className="text-[10px] font-black text-[var(--brand-editor)] uppercase tracking-[0.28em]">The transformation</span>
            <div className="h-px w-10 bg-[var(--brand-editor)]" />
          </div>
          <h2 className="text-4xl sm:text-6xl font-black text-white tracking-tight leading-[1.0]">Before → After.<br /><span className="text-white/20">See the difference.</span></h2>
          <p className="text-white/30 text-lg mt-6 max-w-xl mx-auto leading-relaxed">Drag the slider. Raw footage on the left, professionally edited on the right.</p>
          {/* Tab switcher */}
          <div className="flex items-center justify-center gap-2 mt-8 flex-wrap">
            {BA_TABS.map((t, i) => (
              <button key={t.label} onClick={() => { setTab(i); setPct(48); }}
                className={cn("text-xs font-bold px-4 py-2 rounded-full border transition-all", i === tab ? "text-white border-transparent" : "text-white/30 border-white/10 hover:text-white/60 hover:border-white/20")}
                style={i === tab ? { background: t.col, borderColor: t.col } : {}}>
                {t.label}
              </button>
            ))}
          </div>
        </Reveal>

        <Reveal>
          <div
            ref={containerRef}
            className="relative rounded-3xl overflow-hidden border border-white/10 select-none cursor-col-resize"
            style={{ height: 360 }}
            onMouseMove={e => dragging && moveTo(e.clientX)}
            onMouseDown={e => { setDragging(true); moveTo(e.clientX); }}
            onMouseUp={() => setDragging(false)}
            onMouseLeave={() => setDragging(false)}
            onTouchMove={e => moveTo(e.touches[0].clientX)}
            onTouchStart={e => moveTo(e.touches[0].clientX)}
          >
            {/* AFTER panel — cinematic, color-graded (full width, below) */}
            <div className="absolute inset-0" style={{ background: "#06040f" }}>
              {/* NLE toolbar strip */}
              <div className="absolute top-0 left-0 right-0 h-8 border-b border-white/[0.06] flex items-center px-4 gap-3" style={{ background: "#0d0b1a" }}>
                <div className="flex gap-1.5">
                  {["#ff5f57","#febc2e","#28c840"].map(c => <div key={c} className="w-2.5 h-2.5 rounded-full" style={{ background: c }} />)}
                </div>
                <div className="flex-1 bg-black/30 rounded px-2 py-0.5 flex items-center gap-1.5 max-w-[140px]">
                  <span className="text-[9px] text-white/30 font-mono">{activeTab.file}</span>
                </div>
                <div className="ml-auto flex items-center gap-1.5 bg-emerald-500/15 border border-emerald-500/25 rounded-full px-2.5 py-1">
                  <div className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                  <span className="text-[10px] text-emerald-300 font-bold">After</span>
                </div>
              </div>

              {/* Program monitor — cinematic color grade */}
              <div className="absolute left-1/2 -translate-x-1/2 overflow-hidden rounded-lg border border-white/10 shadow-[0_8px_32px_rgba(0,0,0,0.6)]"
                style={{ top: 40, width: 220, height: 130 }}>
                {/* Cinematic scene: orange & teal color grade */}
                <div className="absolute inset-0">
                  <div className="absolute top-0 left-0 right-0 h-1/2" style={{ background: "linear-gradient(to bottom, #0c1f38 0%, #164e6b 100%)" }} />
                  <div className="absolute bottom-0 left-0 right-0 h-1/2" style={{ background: "linear-gradient(to top, #0a1e14 0%, #0f3322 100%)" }} />
                  {/* Warm-lit subject */}
                  <div className="absolute inset-x-[30%]" style={{ top: "20%", bottom: "25%", background: "linear-gradient(to bottom, #c47a35, #8b5220)", borderRadius: 4 }} />
                  {/* Orange-teal split-tone overlay */}
                  <div className="absolute inset-0 opacity-25" style={{ background: "linear-gradient(135deg, rgba(217,119,6,0.6) 0%, transparent 45%, rgba(15,110,86,0.5) 100%)" }} />
                  {/* Vignette */}
                  <div className="absolute inset-0" style={{ background: "radial-gradient(ellipse at center, transparent 35%, rgba(0,0,0,0.75) 100%)" }} />
                </div>
                {/* Timecode */}
                <div className="absolute bottom-1.5 left-2 right-2 flex items-center justify-between">
                  <span className="text-[8px] text-white/50 font-mono">02:14:08</span>
                  <span className="text-[8px] text-emerald-400 font-mono font-bold">LUT ✓  24fps</span>
                </div>
                {/* Grade badge */}
                <div className="absolute top-1.5 right-1.5 text-[7px] text-emerald-300 font-bold bg-emerald-500/20 border border-emerald-500/30 rounded px-1.5 py-0.5">
                  {activeTab.lut}
                </div>
              </div>

              {/* Timeline */}
              <div className="absolute left-4 right-4" style={{ bottom: 8 }}>
                {/* Track rows */}
                <div className="space-y-1">
                  {/* V1 — main edit, clean cuts */}
                  <div className="flex gap-1 items-center">
                    <div className="w-7 text-[7px] text-white/25 text-right shrink-0 font-mono">V1</div>
                    <div className="flex-1 h-3.5 bg-white/[0.04] rounded overflow-hidden relative flex gap-0.5 p-0.5">
                      <motion.div initial={{ width: 0 }} whileInView={{ width: "32%" }} viewport={{ once: true }} transition={{ duration: 0.9, delay: 0.1, ease: [0.22,1,0.36,1] }} className="h-full rounded-sm shrink-0" style={{ background: "linear-gradient(90deg,#0EA5E9,#38bdf8)" }} />
                      <motion.div initial={{ width: 0 }} whileInView={{ width: "28%" }} viewport={{ once: true }} transition={{ duration: 0.9, delay: 0.25, ease: [0.22,1,0.36,1] }} className="h-full rounded-sm shrink-0" style={{ background: "linear-gradient(90deg,#0EA5E9,#0284c7)" }} />
                      <motion.div initial={{ width: 0 }} whileInView={{ width: "30%" }} viewport={{ once: true }} transition={{ duration: 0.9, delay: 0.38, ease: [0.22,1,0.36,1] }} className="h-full rounded-sm shrink-0" style={{ background: "linear-gradient(90deg,#0EA5E9,#38bdf8)" }} />
                    </div>
                  </div>
                  {/* A1 — normalized audio waveform */}
                  <div className="flex gap-1 items-center">
                    <div className="w-7 text-[7px] text-white/25 text-right shrink-0 font-mono">A1</div>
                    <div className="flex-1 h-3.5 bg-white/[0.04] rounded overflow-hidden relative flex gap-px p-0.5 items-center">
                      {AFTER_WAVEFORM.map((h, i) => (
                        <div key={i} className="flex-1 flex items-center" style={{ height: `${h}%` }}>
                          <motion.div initial={{ scaleY: 0 }} whileInView={{ scaleY: 1 }} viewport={{ once: true }}
                            transition={{ duration: 0.4, delay: 0.5 + i * 0.012 }}
                            className="w-full h-full rounded-full origin-center"
                            style={{ background: "#059669" }} />
                        </div>
                      ))}
                    </div>
                  </div>
                  {/* V2 — B-roll */}
                  <div className="flex gap-1 items-center">
                    <div className="w-7 text-[7px] text-white/25 text-right shrink-0 font-mono">V2</div>
                    <div className="flex-1 h-3.5 bg-white/[0.04] rounded overflow-hidden relative flex gap-0.5 p-0.5">
                      <div className="w-[12%]" />
                      <motion.div initial={{ width: 0 }} whileInView={{ width: "22%" }} viewport={{ once: true }} transition={{ duration: 0.7, delay: 0.6, ease: [0.22,1,0.36,1] }} className="h-full rounded-sm shrink-0" style={{ background: "var(--brand-editor)99" }} />
                      <div className="w-[8%]" />
                      <motion.div initial={{ width: 0 }} whileInView={{ width: "18%" }} viewport={{ once: true }} transition={{ duration: 0.7, delay: 0.75, ease: [0.22,1,0.36,1] }} className="h-full rounded-sm shrink-0" style={{ background: "var(--brand-editor)99" }} />
                    </div>
                  </div>
                  {/* Color — grade node, full length amber */}
                  <div className="flex gap-1 items-center">
                    <div className="w-7 text-[7px] text-amber-500/60 text-right shrink-0 font-mono">CLR</div>
                    <div className="flex-1 h-3.5 bg-white/[0.04] rounded overflow-hidden relative p-0.5">
                      <motion.div initial={{ width: 0 }} whileInView={{ width: "100%" }} viewport={{ once: true }} transition={{ duration: 1.1, delay: 0.85, ease: [0.22,1,0.36,1] }} className="h-full rounded-sm" style={{ background: "linear-gradient(90deg,#d97706,#f59e0b,#d97706)" }} />
                    </div>
                  </div>
                </div>
                {/* Playhead */}
                <div className="absolute top-0 bottom-0 w-px bg-red-500 pointer-events-none" style={{ left: "calc(28px + 52%)" }} />
                {/* Timecodes */}
                <div className="mt-1 flex items-center justify-between pl-8">
                  <span className="text-[8px] text-white/20 font-mono">00:00</span>
                  <span className="text-[8px] text-white/20 font-mono">02:12</span>
                  <span className="text-[8px] text-white/20 font-mono">04:23</span>
                </div>
              </div>
            </div>

            {/* BEFORE panel — flat raw footage (clipped, on top) */}
            <div className="absolute inset-0" style={{ clipPath: `inset(0 ${100 - pct}% 0 0)`, background: "#0d0d0d" }}>
              {/* NLE toolbar strip */}
              <div className="absolute top-0 left-0 right-0 h-8 border-b border-white/[0.04] flex items-center px-4 gap-3" style={{ background: "#111" }}>
                <div className="flex gap-1.5">
                  {["#555","#444","#333"].map(c => <div key={c} className="w-2.5 h-2.5 rounded-full" style={{ background: c }} />)}
                </div>
                <div className="flex-1 bg-black/30 rounded px-2 py-0.5 flex items-center gap-1.5 max-w-[140px]">
                  <span className="text-[9px] text-white/20 font-mono">Sequence 01</span>
                </div>
                <div className="ml-auto flex items-center gap-1.5 bg-white/[0.05] border border-white/10 rounded-full px-2.5 py-1">
                  <span className="text-[10px] text-white/30 font-bold">Before</span>
                </div>
              </div>

              {/* Program monitor — raw flat footage */}
              <div className="absolute left-1/2 -translate-x-1/2 overflow-hidden rounded-lg border border-white/[0.06]"
                style={{ top: 40, width: 220, height: 130, background: "#1a1a1a" }}>
                <div className="absolute inset-0">
                  {/* Flat overexposed sky */}
                  <div className="absolute top-0 left-0 right-0 h-1/2" style={{ background: "linear-gradient(to bottom, #8090a8 0%, #6a7a8c 100%)" }} />
                  {/* Flat ground */}
                  <div className="absolute bottom-0 left-0 right-0 h-1/2" style={{ background: "linear-gradient(to top, #3a3d35 0%, #4a4d45 100%)" }} />
                  {/* Subject — grey, flat */}
                  <div className="absolute inset-x-[30%]" style={{ top: "20%", bottom: "25%", background: "#7a7060", borderRadius: 4 }} />
                  {/* Noise grain */}
                  <div className="absolute inset-0 opacity-[0.08]" style={{ backgroundImage: "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='200' height='200'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4'/%3E%3C/filter%3E%3Crect width='200' height='200' filter='url(%23n)' opacity='1'/%3E%3C/svg%3E\")", backgroundSize: "200px 200px" }} />
                  {/* Exposure warning — clipping highlight */}
                  <div className="absolute top-0 left-0 right-0 h-2 opacity-30" style={{ background: "#fff" }} />
                </div>
                {/* Timecode */}
                <div className="absolute bottom-1.5 left-2 right-2 flex items-center justify-between">
                  <span className="text-[8px] text-white/25 font-mono">02:14:08</span>
                  <span className="text-[8px] text-white/20 font-mono">H.264 · RAW</span>
                </div>
                {/* Grade badge */}
                <div className="absolute top-1.5 right-1.5 text-[7px] text-white/30 font-bold bg-white/5 border border-white/10 rounded px-1.5 py-0.5">
                  NO GRADE
                </div>
              </div>

              {/* Timeline — raw, minimal */}
              <div className="absolute left-4 right-4" style={{ bottom: 8 }}>
                <div className="space-y-1">
                  {/* V1 — one long raw clip */}
                  <div className="flex gap-1 items-center">
                    <div className="w-7 text-[7px] text-white/15 text-right shrink-0 font-mono">V1</div>
                    <div className="flex-1 h-3.5 bg-white/[0.03] rounded overflow-hidden flex gap-0.5 p-0.5">
                      <div className="h-full rounded-sm opacity-25 flex-none" style={{ width: "72%", background: "#555" }} />
                    </div>
                  </div>
                  {/* A1 — flat, uneven waveform */}
                  <div className="flex gap-1 items-center">
                    <div className="w-7 text-[7px] text-white/15 text-right shrink-0 font-mono">A1</div>
                    <div className="flex-1 h-3.5 bg-white/[0.03] rounded overflow-hidden flex gap-px p-0.5 items-center">
                      {BEFORE_WAVEFORM.map((h, i) => (
                        <div key={i} className="flex-1 rounded-full"
                          style={{ background: "#444", height: `${h}%`, opacity: 0.3 }} />
                      ))}
                    </div>
                  </div>
                  {/* V2 — empty */}
                  <div className="flex gap-1 items-center">
                    <div className="w-7 text-[7px] text-white/15 text-right shrink-0 font-mono">V2</div>
                    <div className="flex-1 h-3.5 bg-white/[0.03] rounded overflow-hidden" />
                  </div>
                  {/* CLR — empty */}
                  <div className="flex gap-1 items-center">
                    <div className="w-7 text-[7px] text-white/10 text-right shrink-0 font-mono">CLR</div>
                    <div className="flex-1 h-3.5 bg-white/[0.03] rounded overflow-hidden" />
                  </div>
                </div>
                <div className="mt-1 flex items-center justify-between pl-8">
                  <span className="text-[8px] text-white/10 font-mono">00:00</span>
                  <span className="text-[8px] text-white/10 font-mono">02:12</span>
                  <span className="text-[8px] text-white/10 font-mono">04:23</span>
                </div>
              </div>
            </div>

            {/* Divider handle */}
            <div className="absolute top-0 bottom-0 z-10 flex items-center pointer-events-none" style={{ left: `${pct}%`, transform: "translateX(-50%)" }}>
              <div className="w-0.5 h-full bg-white/60" />
              <motion.div
                className="absolute w-10 h-10 rounded-full bg-white shadow-xl flex items-center justify-center gap-0.5 pointer-events-auto cursor-col-resize"
                animate={hinted ? { x: [0, -12, 12, -12, 12, -6, 6, 0] } : { x: 0 }}
                transition={hinted ? { duration: 1.4, ease: "easeInOut", times: [0, 0.14, 0.28, 0.43, 0.57, 0.71, 0.86, 1] } : {}}
              >
                <ChevronLeft className="w-3 h-3 text-gray-500" />
                <ChevronRight className="w-3 h-3 text-gray-500" />
              </motion.div>
            </div>
          </div>
        </Reveal>

        {/* Before / After description chips */}
        <div className="mt-6 grid sm:grid-cols-2 gap-3">
          <div className="flex items-start gap-3 bg-white/[0.03] border border-white/[0.06] rounded-2xl px-5 py-4">
            <div className="w-2 h-2 rounded-full bg-white/20 mt-1.5 shrink-0" />
            <div>
              <p className="text-[10px] font-bold text-white/20 uppercase tracking-wider mb-1">Before</p>
              <p className="text-sm text-white/50">{activeTab.before}</p>
            </div>
          </div>
          <div className="flex items-start gap-3 border rounded-2xl px-5 py-4" style={{ background: `${activeTab.col}10`, borderColor: `${activeTab.col}25` }}>
            <div className="w-2 h-2 rounded-full mt-1.5 shrink-0" style={{ background: activeTab.col }} />
            <div>
              <p className="text-[10px] font-bold uppercase tracking-wider mb-1" style={{ color: `${activeTab.col}80` }}>After</p>
              <p className="text-sm" style={{ color: `${activeTab.col}cc` }}>{activeTab.after}</p>
            </div>
          </div>
        </div>

        <Reveal className="mt-10 text-center">
          <Link href="/browse" className="inline-flex items-center gap-2 bg-[var(--brand-client)] hover:bg-[var(--brand-client-hover)] text-white font-semibold px-7 py-3.5 rounded-xl text-sm transition-colors shadow-[0_8px_24px_rgba(14,165,233,0.45)]">
            Find your editor <ArrowRight className="w-4 h-4" />
          </Link>
        </Reveal>
      </div>
    </section>
  );
}

/* ════════════════════════════════════════════════════════════════════════════
   WHY EDITBRIDGE — feature bento grid
════════════════════════════════════════════════════════════════════════════ */
const WHY_FEATURES = [
  { icon: ShieldCheck,   title: "KYC-Verified Editors",         desc: "Every editor completes government ID verification before accepting any order — passport, Aadhaar, or PAN verified by our team. You always know exactly who you're working with: a real, credentialed professional.",  col: "var(--brand-client)", span: "lg:col-span-2", hero: true },
  { icon: Lock,          title: "Verified Payment Protection",  desc: "Your payment is held securely until you approve the final delivery. If something goes wrong, you get your money back.",      col: "#2563eb" },
  { icon: MessageSquare, title: "Real-time Collaboration",      desc: "Briefs, files, revisions, and feedback — all in one place. No scattered DMs, no lost files.",                              col: "var(--brand-teal)" },
  { icon: FileCheck,     title: "Revisions Included",           desc: "Every package comes with revision rounds built in. Your editor works until you're satisfied — no extra charges.",           col: "#d97706" },
  { icon: ThumbsUp,      title: "Verified Reviews Only",        desc: "Stars are only left by clients who actually placed and completed an order. No fake reviews, ever.",                         col: "#db2777" },
  { icon: Zap,           title: "Structured Dispute Resolution",desc: "Dedicated support for every disagreement. Clear timelines, fair outcomes, and a team that takes both sides seriously.",    col: "var(--brand-editor)", span: "lg:col-span-3", full: true },
];

export function AnimatedWhySection() {
  return (
    <section className="bg-white py-10 md:py-16 px-6 overflow-hidden relative">
      <div className="relative max-w-6xl mx-auto">
        <Reveal className="text-center mb-8">
          <div className="flex items-center justify-center gap-3 mb-5"><div className="h-px w-10 bg-[var(--brand-client)]"/><span className="text-[10px] font-black text-[var(--brand-client)] uppercase tracking-[0.28em]">Why EditBridge</span><div className="h-px w-10 bg-[var(--brand-client)]"/></div>
          <h2 className="text-4xl sm:text-6xl font-black text-gray-900 tracking-tight leading-[1.0]">Everything you need.<br /><span className="text-gray-300">Built into one platform.</span></h2>
        </Reveal>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {WHY_FEATURES.map(({ icon: Icon, title, desc, col, span, hero, full }, i) => (
            <Reveal key={title} delay={i * 0.1} className={span}>
              {full ? (
                <motion.div whileHover={{ y: -3, boxShadow: `0 20px 50px ${col}18` }}
                  className="group bg-white rounded-3xl p-7 border border-gray-100 shadow-sm transition-all flex flex-col sm:flex-row sm:items-center gap-6 h-full">
                  <div className="w-14 h-14 rounded-2xl flex items-center justify-center shrink-0 transition-all group-hover:scale-110"
                    style={{ background: `${col}15`, border: `1px solid ${col}25` }}>
                    <Icon className="w-6 h-6" style={{ color: col }} strokeWidth={1.5} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="text-gray-900 font-bold text-xl mb-1.5 leading-tight">{title}</h3>
                    <p className="text-gray-400 text-sm leading-relaxed">{desc}</p>
                  </div>
                  <span className="shrink-0 inline-flex items-center gap-1.5 text-xs font-bold px-4 py-2 rounded-full whitespace-nowrap"
                    style={{ background: `${col}12`, color: col, border: `1px solid ${col}25` }}>
                    <CheckCircle className="w-3.5 h-3.5" strokeWidth={2} />
                    Fair &amp; fast outcomes
                  </span>
                </motion.div>
              ) : hero ? (
                <motion.div whileHover={{ y: -4, boxShadow: `0 24px 60px ${col}25` }}
                  className="group bg-white rounded-3xl p-8 border shadow-sm transition-all h-full relative overflow-hidden"
                  style={{ borderColor: `${col}30` }}>
                  <div className="absolute top-0 right-0 w-56 h-56 rounded-full pointer-events-none"
                    style={{ background: `radial-gradient(${col}10, transparent 70%)` }} />
                  <div className="relative">
                    <div className="w-16 h-16 rounded-3xl flex items-center justify-center mb-6 transition-all group-hover:scale-110"
                      style={{ background: `${col}18`, border: `1.5px solid ${col}35` }}>
                      <Icon className="w-8 h-8" style={{ color: col }} strokeWidth={1.5} />
                    </div>
                    <h3 className="text-gray-900 font-black text-2xl mb-3 leading-tight">{title}</h3>
                    <p className="text-gray-400 text-sm leading-relaxed mb-6">{desc}</p>
                    <span className="inline-flex items-center gap-1.5 text-xs font-bold px-3 py-1.5 rounded-full"
                      style={{ background: `${col}12`, color: col, border: `1px solid ${col}28` }}>
                      <ShieldCheck className="w-3.5 h-3.5" strokeWidth={2} />
                      100% verified before first order
                    </span>
                  </div>
                </motion.div>
              ) : (
                <motion.div whileHover={{ y: -4, boxShadow: `0 20px 50px ${col}18` }}
                  className="group bg-white rounded-3xl p-7 border border-gray-100 shadow-sm transition-all h-full">
                  <div className="w-12 h-12 rounded-2xl flex items-center justify-center mb-5 transition-all group-hover:scale-110"
                    style={{ background: `${col}15`, border: `1px solid ${col}25` }}>
                    <Icon className="w-5 h-5" style={{ color: col }} strokeWidth={1.5} />
                  </div>
                  <h3 className="text-gray-900 font-bold text-lg mb-2 leading-tight">{title}</h3>
                  <p className="text-gray-400 text-sm leading-relaxed">{desc}</p>
                  <div className="mt-5 h-0.5 rounded-full w-8 transition-all group-hover:w-16" style={{ background: col }} />
                </motion.div>
              )}
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  );
}

/* ════════════════════════════════════════════════════════════════════════════
   ABOUT
════════════════════════════════════════════════════════════════════════════ */
const ABOUT_ORDER_ROWS = [
  { label: "Client",  val: "Rohan S.",          sub: "YouTube Creator · Delhi",    col: "var(--brand-client)" },
  { label: "Editor",  val: "Arjun Mehta",        sub: "KYC Verified · Top Rated",  col: "#059669" },
  { label: "Package", val: "YouTube Edit Pro",   sub: "₹4,500 · 3 day delivery",   col: "#d97706" },
  { label: "Payment", val: "₹4,500 protected",   sub: "Released on approval only",  col: "#2563eb" },
  { label: "Status",  val: "In progress",        sub: "Day 2 of 3 · 68% complete", col: "var(--brand-teal)" },
];

export function AnimatedAbout() {
  const cardRef = useRef<HTMLDivElement>(null);
  const cardInView = useInView(cardRef, { once: true, margin: "-80px" });
  const [revealedCount, setRevealedCount] = useState(-1);
  useEffect(() => {
    if (!cardInView) return;
    ABOUT_ORDER_ROWS.forEach((_, i) => setTimeout(() => setRevealedCount(i), 300 + i * 220));
  }, [cardInView]);
  return (
    <section className="bg-[#06040f] py-10 md:py-16 px-6 overflow-hidden relative">
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        <motion.div animate={{ x:["0%","14%","0%"],y:["0%","8%","0%"] }} transition={{ duration:20,repeat:Infinity,ease:"easeInOut" }}
          className="absolute -top-1/3 -right-1/4 w-[700px] h-[600px] rounded-full opacity-25" style={{background:"radial-gradient(ellipse,#0EA5E9,transparent 65%)"}}/>
        <motion.div animate={{ x:["0%","-10%","0%"],y:["0%","12%","0%"] }} transition={{ duration:25,repeat:Infinity,ease:"easeInOut",delay:5 }}
          className="absolute bottom-0 left-0 w-[600px] h-[500px] rounded-full opacity-18" style={{background:"radial-gradient(ellipse,#0F6E56,transparent 65%)"}}/>
      </div>
      <div className="absolute inset-0 opacity-[0.04]" style={{backgroundImage:`linear-gradient(rgba(255,255,255,0.5) 1px,transparent 1px),linear-gradient(90deg,rgba(255,255,255,0.5) 1px,transparent 1px)`,backgroundSize:"60px 60px"}}/>

      <div className="relative z-10 max-w-7xl mx-auto grid lg:grid-cols-2 gap-20 items-center">
        <div>
          <Reveal>
            <div className="flex items-center gap-3 mb-6"><div className="h-px w-8 bg-[#7c6ff7]"/><span className="text-[10px] font-black text-[#7c6ff7] uppercase tracking-[0.28em]">Our story</span></div>
            <h2 className="text-4xl sm:text-6xl font-black text-white tracking-tight mb-8 leading-none">Built because<br />we needed<br /><span className="text-white/15">it ourselves.</span></h2>
          </Reveal>
          <Reveal delay={0.15}>
            <p className="text-white/55 text-lg leading-relaxed mb-10">We launched EditBridge in 2026 because hiring video editors in India was broken — ghosted after payment, late deliveries, unverified strangers. We built the platform we always needed: every editor KYC-verified, every payment protected, every dispute resolved.</p>
          </Reveal>
          <div className="grid grid-cols-2 gap-3">
            {[["5+","Content niches supported","var(--brand-client)"],["India","Built for Indian creators","var(--brand-teal)"],["48hrs","Avg. project kickoff time","#2563eb"],["2026","The year we started","#d97706"]].map(([val,lab,col])=>(
              <Reveal key={lab} delay={0.2}>
                <motion.div whileHover={{y:-2,borderColor:`${col}40`}} className="border border-white/[0.06] bg-white/[0.03] rounded-2xl p-5 transition-all" style={{}}>
                  <p className="text-2xl font-black mb-1" style={{color:col as string}}>{val}</p>
                  <p className="text-white/45 text-xs font-medium">{lab}</p>
                </motion.div>
              </Reveal>
            ))}
          </div>
        </div>

        <Reveal from="right">
          <TiltCard intensity={5}>
            <div className="rounded-3xl overflow-hidden p-7"
              style={{background:"linear-gradient(#0f0b22,#0f0b22) padding-box, linear-gradient(135deg,rgba(74,63,181,0.5),rgba(15,110,86,0.25)) border-box", border:"1px solid transparent"}}>
              <div className="absolute top-0 right-0 w-60 h-60 rounded-full bg-[var(--brand-client)]/20 blur-3xl pointer-events-none"/>
              <div className="absolute bottom-0 left-0 w-40 h-40 rounded-full bg-[var(--brand-teal)]/15 blur-2xl pointer-events-none"/>
              <div className="relative">
                <p className="text-[10px] text-white/20 uppercase tracking-[0.2em] font-black mb-6">A real protected order</p>
                <div className="space-y-2.5" ref={cardRef}>
                  {ABOUT_ORDER_ROWS.map(({ label, val, sub, col }, i) => (
                    <motion.div key={label}
                      initial={{ opacity: 0, x: -20 }}
                      animate={revealedCount >= i ? { opacity: 1, x: 0 } : { opacity: 0, x: -20 }}
                      transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
                      className="relative flex items-center gap-4 bg-white/[0.03] rounded-2xl px-4 py-3.5"
                      style={{ border: "1px solid rgba(255,255,255,0.04)" }}>
                      {revealedCount === i && (
                        <motion.div
                          key={`pulse-${i}`}
                          initial={{ opacity: 0.5 }} animate={{ opacity: 0 }}
                          transition={{ duration: 0.9 }}
                          className="absolute inset-0 rounded-2xl pointer-events-none"
                          style={{ border: `1px solid ${col}55`, boxShadow: `0 0 12px ${col}22` }}
                        />
                      )}
                      <div className="w-1 h-8 rounded-full shrink-0" style={{ background: col }} />
                      <div className="flex-1 min-w-0">
                        <p className="text-[10px] text-white/20 mb-0.5 font-medium uppercase tracking-wider">{label}</p>
                        <p className="text-sm text-white/80 font-semibold">{val}</p>
                        <p className="text-[10px] text-white/20 mt-0.5">{sub}</p>
                      </div>
                    </motion.div>
                  ))}
                </div>
                <div className="mt-5 pt-5 border-t border-white/[0.05] flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <motion.span animate={{scale:[1,1.6,1]}} transition={{duration:1.6,repeat:Infinity}} className="w-2 h-2 rounded-full bg-emerald-400 inline-block"/>
                    <span className="text-xs text-white/30 font-medium">Live order</span>
                  </div>
                  <span className="text-xs text-[#7c6ff7] font-semibold">Protected ✓</span>
                </div>
              </div>
            </div>
          </TiltCard>
        </Reveal>
      </div>
    </section>
  );
}

/* ════════════════════════════════════════════════════════════════════════════
   SCROLLING REVIEWS
════════════════════════════════════════════════════════════════════════════ */
const REVIEWS = [
  { quote: "Found a YouTube editor in 10 minutes. KYC verified, delivered in 48 hours. My thumbnail CTR jumped from 5.8% to 11.2% after the first edit.", author: "Karan D.", role: "YouTuber · 280k subs", initials: "KD", col: "var(--brand-editor)", rating: 5 },
  { quote: "Paid, editor delivered, money stayed in escrow the whole time. Never had a freelancer experience this clean in India — by a very long shot.", author: "Meera P.", role: "Reels Creator · Pune · 98k", initials: "MP", col: "#059669", rating: 5 },
  { quote: "My Reels editor consistently delivers in under 36 hours. Since switching, my average view duration went from 12s to 28s — reel performance doubled.", author: "Sneha R.", role: "Instagram Creator · 90k followers", initials: "SR", col: "#db2777", rating: 5 },
  { quote: "Every editor is government-ID verified. That single fact made me trust this platform more than any other marketplace I've used in 4 years of content.", author: "Ankit V.", role: "Podcast Creator · Delhi · 45k", initials: "AV", col: "#ea580c", rating: 5 },
  { quote: "3 editors. 3 orders. All delivered on brief, all on time. I've never had that consistency from a single freelancer, let alone three different people.", author: "Rohan S.", role: "YouTuber · 120k subs", initials: "RS", col: "#2563eb", rating: 5 },
  { quote: "Brief, chat, files, payment — all in one place. Zero WhatsApp back-and-forth. My production workflow is 3× faster than it was 6 months ago.", author: "Divya K.", role: "Brand Creator · Bangalore", initials: "DK", col: "var(--brand-teal)", rating: 5 },
  { quote: "Turnaround cut from 9 days to 2 days. My channel went from 55k to 94k subscribers in 3 months. The editing quality is genuinely TV-level.", author: "Vivek D.", role: "Tech YouTuber · 94k subs", initials: "VD", col: "var(--brand-client)", rating: 5 },
  { quote: "3 free revisions included — the editor treated every single one seriously. Final video hit 2.4M views on my channel. Best ₹4,500 I've ever spent.", author: "Priya M.", role: "Lifestyle Creator · Mumbai · 210k", initials: "PM", col: "#d97706", rating: 5 },
  { quote: "Was sceptical about a new platform. After my first order I understood — the KYC + escrow system solves the exact two fears that stopped me hiring freelancers.", author: "Arjun S.", role: "Gaming Creator · Hyderabad · 38k", initials: "AS", col: "var(--brand-editor)", rating: 5 },
  { quote: "Hired a podcast editor within hours of signing up. Episode audio went from 'recorded on phone' to 'sounds like a studio'. Listeners immediately noticed.", author: "Nisha T.", role: "Podcast Host · Chennai · 22k", initials: "NT", col: "#059669", rating: 5 },
];

const ROW1 = REVIEWS.slice(0, 5);
const ROW2 = REVIEWS.slice(5);

function ReviewCard({ quote, author, role, initials, col, rating }: typeof REVIEWS[0]) {
  return (
    <div className="w-[300px] shrink-0 rounded-2xl bg-white border border-gray-100 shadow-[0_4px_20px_rgba(0,0,0,0.06)] p-5 mx-2">
      <div className="flex gap-0.5 mb-3">
        {Array.from({ length: rating }).map((_, i) => (
          <Star key={i} className="w-3.5 h-3.5 text-amber-400 fill-amber-400" />
        ))}
      </div>
      <p className="text-gray-700 text-sm leading-relaxed mb-4">&ldquo;{quote}&rdquo;</p>
      <div className="flex items-center gap-2.5 pt-3 border-t border-gray-50">
        <div className="w-7 h-7 rounded-full flex items-center justify-center text-white text-[9px] font-black shrink-0" style={{ background: col }}>{initials}</div>
        <div>
          <p className="text-gray-900 text-xs font-semibold">{author}</p>
          <p className="text-gray-400 text-[10px]">{role}</p>
          <div className="flex items-center gap-1 mt-1">
            <CheckCircle className="w-3 h-3 text-emerald-500" />
            <span className="text-[9px] text-emerald-600 font-semibold">Verified order</span>
          </div>
        </div>
      </div>
    </div>
  );
}

export function AnimatedScrollingReviews() {
  const prefersReduced = useReducedMotion();
  return (
    <section className="bg-gray-50 py-8 md:py-14 overflow-hidden">
      <Reveal className="text-center mb-12 px-6">
        <div className="flex items-center justify-center gap-3 mb-4">
          <div className="h-px w-10 bg-[var(--brand-client)]" />
          <span className="text-[10px] font-black text-[var(--brand-client)] uppercase tracking-[0.28em]">Creator reviews</span>
          <div className="h-px w-10 bg-[var(--brand-client)]" />
        </div>
        <h2 className="text-4xl sm:text-5xl font-black text-gray-900 tracking-tight">
          Loved by creators<br /><span className="text-gray-300">across India.</span>
        </h2>
      </Reveal>

      {/* Row 1 — scrolls left */}
      <div className="relative mb-3">
        <div className="absolute left-0 top-0 bottom-0 w-24 z-10 pointer-events-none" style={{ background: "linear-gradient(to right, #f9fafb, transparent)" }} />
        <div className="absolute right-0 top-0 bottom-0 w-24 z-10 pointer-events-none" style={{ background: "linear-gradient(to left, #f9fafb, transparent)" }} />
        <motion.div className="flex"
          animate={prefersReduced ? {} : { x: ["0%", "-50%"] }}
          transition={prefersReduced ? {} : { duration: 32, repeat: Infinity, ease: "linear" }}>
          {[...ROW1, ...ROW1].map((r, i) => <ReviewCard key={i} {...r} />)}
        </motion.div>
      </div>

      {/* Row 2 — scrolls right */}
      <div className="relative">
        <div className="absolute left-0 top-0 bottom-0 w-24 z-10 pointer-events-none" style={{ background: "linear-gradient(to right, #f9fafb, transparent)" }} />
        <div className="absolute right-0 top-0 bottom-0 w-24 z-10 pointer-events-none" style={{ background: "linear-gradient(to left, #f9fafb, transparent)" }} />
        <motion.div className="flex"
          animate={prefersReduced ? {} : { x: ["-50%", "0%"] }}
          transition={prefersReduced ? {} : { duration: 28, repeat: Infinity, ease: "linear" }}>
          {[...ROW2, ...ROW2].map((r, i) => <ReviewCard key={i} {...r} />)}
        </motion.div>
      </div>
    </section>
  );
}

/* ════════════════════════════════════════════════════════════════════════════
   TESTIMONIALS
════════════════════════════════════════════════════════════════════════════ */
const QUOTES = [
  { quote: "EditBridge cut my turnaround from a week to 2 days. My channel grew 40% in 3 months. The payment protection made me trust it completely from day one.", author: "Karan D.", role: "YouTuber",           initials: "KD", col: "var(--brand-editor)", contentType: "YouTube Long-form", subs: "280k subscribers" },
  { quote: "Paid, editor delivered, they couldn't touch a rupee till I said so. Best freelance experience I've had in India — by a long shot.",            author: "Meera P.", role: "Reels Creator",          initials: "MP", col: "#059669", contentType: "Instagram Reels",  subs: "98k followers"    },
  { quote: "Every editor I hired was KYC verified. That single fact made me trust the platform more than any other marketplace I've ever used.",           author: "Ankit V.", role: "Podcast Creator",        initials: "AV", col: "#ea580c", contentType: "Podcast",          subs: "45k listeners"    },
  { quote: "3 editors. 3 orders. All on time, all exactly as briefed. I've never had that consistency anywhere else. EditBridge is the real deal.",         author: "Rohan S.", role: "YouTuber",           initials: "RS", col: "#2563eb", contentType: "YouTube Long-form", subs: "120k subscribers" },
];

export function AnimatedTestimonials() {
  const [cur, setCur] = useState(0); const [dir, setDir] = useState(1);
  const go = useCallback((d: number) => { setDir(d); setCur(c => (c + d + QUOTES.length) % QUOTES.length); }, []);
  const prefersReduced = useReducedMotion();
  useEffect(() => {
    if (prefersReduced) return;
    const t = setInterval(() => go(1), 6000); return () => clearInterval(t);
  }, [go, prefersReduced]);
  const q = QUOTES[cur];
  return (
    <section className="bg-white py-10 md:py-16 px-6">
      <div className="max-w-5xl mx-auto">
        <div className="flex items-center gap-4 mb-16"><div className="h-px w-10 bg-[var(--brand-client)]"/><span className="text-[10px] font-black text-[var(--brand-client)] uppercase tracking-[0.28em]">What creators say</span></div>
        <div className="relative min-h-[240px]">
          <div className="absolute -top-4 -left-2 text-[100px] leading-none font-black text-gray-100 select-none pointer-events-none z-0">&ldquo;</div>
          <AnimatePresence mode="wait" custom={dir}>
            <motion.div key={cur} custom={dir}
              initial={{opacity:0,x:dir>0?80:-80,filter:"blur(4px)"}} animate={{opacity:1,x:0,filter:"blur(0px)"}} exit={{opacity:0,x:dir>0?-80:80,filter:"blur(4px)"}}
              transition={{duration:0.5,ease:[0.22,1,0.36,1]}} className="relative z-10">
              <p className="text-2xl sm:text-3xl lg:text-[2.5rem] font-bold text-gray-900 leading-[1.25] mb-10 max-w-4xl tracking-tight">{q.quote}</p>
              <div className="flex items-center justify-between flex-wrap gap-6">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 rounded-2xl flex items-center justify-center text-white font-black text-sm shadow-lg" style={{background:q.col}}>{q.initials}</div>
                  <div>
                    <p className="font-bold text-gray-900">{q.author}</p>
                    <p className="text-sm text-gray-400">{q.role}</p>
                    <div className="flex items-center gap-2 mt-1">
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-full" style={{ background: `${q.col}12`, color: q.col }}>{q.contentType}</span>
                      <span className="text-[10px] text-gray-300">{q.subs}</span>
                    </div>
                  </div>
                </div>
                <div className="flex gap-0.5">{[1,2,3,4,5].map(j=><Star key={j} className="w-5 h-5 text-amber-400 fill-amber-400"/>)}</div>
              </div>
            </motion.div>
          </AnimatePresence>
        </div>
        <div className="flex items-center gap-4 mt-12">
          <button onClick={()=>go(-1)} className="w-10 h-10 rounded-full border border-gray-200 flex items-center justify-center text-gray-400 hover:text-gray-900 hover:border-gray-400 transition-all"><ChevronLeft className="w-4 h-4"/></button>
          <div className="flex gap-2">{QUOTES.map((_,i)=><button key={i} onClick={()=>{setDir(i>cur?1:-1);setCur(i);}} className={cn("rounded-full transition-all",i===cur?"w-8 h-2 bg-[var(--brand-client)]":"w-2 h-2 bg-gray-200 hover:bg-gray-300")}/>)}</div>
          <button onClick={()=>go(1)} className="w-10 h-10 rounded-full border border-gray-200 flex items-center justify-center text-gray-400 hover:text-gray-900 hover:border-gray-400 transition-all"><ChevronRight className="w-4 h-4"/></button>
          <span className="ml-auto text-xs text-gray-300 font-medium">{cur+1} / {QUOTES.length}</span>
        </div>
      </div>
    </section>
  );
}

/* ════════════════════════════════════════════════════════════════════════════
   NICHE TRUST BAR  (Fix 25)
════════════════════════════════════════════════════════════════════════════ */
const NICHES_BAR: { label: string; href: string }[] = [
  { label: "YouTube Videos",  href: "/editors/youtube-video-editing" },
  { label: "Instagram Reels", href: "/editors/instagram-reels" },
  { label: "Podcasts",        href: "/editors/podcast-video-editing" },
  { label: "Corporate Video", href: "/editors/corporate-video-editing" },
  { label: "Wedding Films",   href: "/editors/wedding-videography" },
  { label: "Thumbnails",      href: "/editors/thumbnail-design" },
  { label: "Motion Graphics", href: "/editors/motion-graphics" },
  { label: "Short-form Ads",  href: "/editors/short-form-ads" },
];

export function NicheBar() {
  return (
    <section className="border-y border-gray-100 bg-white py-4 px-6 overflow-hidden">
      <div className="max-w-7xl mx-auto flex items-center gap-5">
        <span className="text-[9px] font-black text-gray-300 uppercase tracking-[0.3em] shrink-0">Built for</span>
        <div className="h-3 w-px bg-gray-100 shrink-0" />
        <div className="flex items-center gap-8 overflow-x-auto" style={{ scrollbarWidth: "none" }}>
          {NICHES_BAR.map(({ label, href }, i) => (
            <motion.span key={label}
              initial={{ opacity: 0 }} animate={{ opacity: 1 }}
              transition={{ delay: 0.1 + i * 0.06, duration: 0.5 }}>
              <Link href={href} className="text-[10px] font-bold text-gray-300 uppercase tracking-[0.18em] whitespace-nowrap hover:text-[var(--brand-client)] transition-colors">
                {label}
              </Link>
            </motion.span>
          ))}
        </div>
      </div>
    </section>
  );
}

/* ════════════════════════════════════════════════════════════════════════════
   SHOWCASE PREVIEW — 3-tile strip from curated portfolio
════════════════════════════════════════════════════════════════════════════ */
const SHOWCASE_COLORS = ["var(--brand-client)", "var(--brand-editor)", "var(--brand-teal)"];

interface ShowcaseItem {
  id: string;
  title: string | null;
  category: string | null;
  editorName: string;
  likesCount: number;
  viewsCount: number;
}

export function ShowcasePreviewSection({ items }: { items: ShowcaseItem[] }) {
  const tiles = items.length > 0 ? items : [
    { id: "1", title: "Brand Ad — Product Launch", category: "Motion Graphics", editorName: "Arjun M.", likesCount: 42, viewsCount: 320 },
    { id: "2", title: "YouTube Long-form Edit", category: "YouTube",            editorName: "Priya S.", likesCount: 38, viewsCount: 290 },
    { id: "3", title: "Reels Montage — Fitness",  category: "Short-form",       editorName: "Rahul K.", likesCount: 31, viewsCount: 215 },
  ];

  return (
    <section className="bg-gray-950 py-8 md:py-14 px-6">
      <div className="max-w-7xl mx-auto">
        <div className="flex items-end justify-between mb-12 flex-wrap gap-6">
          <Reveal>
            <div className="flex items-center gap-3 mb-4"><div className="h-px w-10 bg-[var(--brand-editor)]"/><span className="text-[10px] font-black text-[var(--brand-editor)] uppercase tracking-[0.28em]">Showcase</span></div>
            <h2 className="text-4xl sm:text-5xl font-black text-white tracking-tight leading-none">
              Real work.<br /><span className="text-white/20">By real editors.</span>
            </h2>
          </Reveal>
          <Reveal delay={0.1}>
            <Link href="/showcase" className="inline-flex items-center gap-2 border border-white/10 text-white/50 hover:text-white hover:border-white/20 text-sm font-medium px-5 py-2.5 rounded-xl transition-all">
              View all <ArrowUpRight className="w-4 h-4"/>
            </Link>
          </Reveal>
        </div>

        <div className="grid sm:grid-cols-3 gap-4">
          {tiles.slice(0, 3).map((item, i) => (
            <Reveal key={item.id} delay={i * 0.08} className="group">
              <Link href="/showcase" className="block">
                <div className="relative aspect-video rounded-2xl overflow-hidden border border-white/[0.07] cursor-pointer">
                  {/* Coloured gradient stand-in (replaces an <img> when no thumbnail URL exists) */}
                  <div className="absolute inset-0 transition-transform duration-500 group-hover:scale-[1.04]"
                    style={{ background: `linear-gradient(135deg, ${SHOWCASE_COLORS[i]}30 0%, ${SHOWCASE_COLORS[i]}10 100%)` }} />
                  <div className="absolute inset-0 opacity-[0.06]"
                    style={{ backgroundImage: "radial-gradient(rgba(255,255,255,0.6) 1px, transparent 1px)", backgroundSize: "12px 12px" }} />
                  {/* Play button */}
                  <div className="absolute inset-0 flex items-center justify-center">
                    <div className="w-12 h-12 rounded-full bg-white/10 backdrop-blur-sm border border-white/20 flex items-center justify-center group-hover:bg-white/20 transition-all group-hover:scale-110 duration-300">
                      <div className="w-0 h-0 border-t-[8px] border-t-transparent border-l-[14px] border-l-white/80 border-b-[8px] border-b-transparent ml-1" />
                    </div>
                  </div>
                  {/* Category badge */}
                  {item.category && (
                    <div className="absolute top-3 left-3">
                      <span className="text-[10px] font-bold text-white/70 bg-black/30 backdrop-blur-sm border border-white/10 px-2.5 py-1 rounded-full">
                        {item.category}
                      </span>
                    </div>
                  )}
                  {/* Stats bar */}
                  <div className="absolute bottom-0 inset-x-0 p-4 bg-gradient-to-t from-black/60 to-transparent">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3 text-[11px] text-white/60">
                        <span className="flex items-center gap-1"><ThumbsUp className="w-3 h-3" />{item.likesCount}</span>
                        <span className="flex items-center gap-1"><TrendingUp className="w-3 h-3" />{item.viewsCount}</span>
                      </div>
                      <span className="text-[10px] text-white/40">{item.editorName}</span>
                    </div>
                  </div>
                </div>
                <p className="mt-3 text-sm font-semibold text-white/70 group-hover:text-white transition-colors">{item.title}</p>
              </Link>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  );
}

/* ════════════════════════════════════════════════════════════════════════════
   LEADERBOARD TEASER — top 5 editors above editor cards
════════════════════════════════════════════════════════════════════════════ */
const RANK_BADGES = ["🥇", "🥈", "🥉", "4th", "5th"];
const RANK_COLORS = ["#F59E0B", "#94A3B8", "#CD7F32", "#6B7280", "#6B7280"];

interface LeaderboardEditor {
  id: string;
  name: string;
  niche: string | null;
  avgRating: number | null;
  totalOrders: number;
  initials: string;
}

export function LeaderboardTeaser({ editors: eds }: { editors: LeaderboardEditor[] }) {
  const list = eds.length > 0 ? eds : [
    { id: "1", name: "Arjun M.",  niche: "YouTube Long-form", avgRating: 4.9, totalOrders: 38, initials: "AM" },
    { id: "2", name: "Priya S.",  niche: "Thumbnails",        avgRating: 5.0, totalOrders: 31, initials: "PS" },
    { id: "3", name: "Rahul K.",  niche: "Reels & Shorts",    avgRating: 4.8, totalOrders: 27, initials: "RK" },
    { id: "4", name: "Nisha P.",  niche: "Corporate Ads",     avgRating: 4.7, totalOrders: 22, initials: "NP" },
    { id: "5", name: "Vivek D.",  niche: "Podcast",           avgRating: 4.9, totalOrders: 19, initials: "VD" },
  ];

  return (
    <section className="bg-white py-10 px-6 border-b border-gray-100">
      <div className="max-w-7xl mx-auto">
        <div className="flex items-center justify-between mb-6 flex-wrap gap-4">
          <div className="flex items-center gap-3">
            <TrendingUp className="w-4 h-4 text-amber-500" />
            <span className="text-xs font-black text-gray-400 uppercase tracking-[0.24em]">Top editors this week</span>
          </div>
          <Link href="/leaderboard" className="text-xs text-[var(--brand-client)] hover:underline font-semibold flex items-center gap-1">
            Full leaderboard <ArrowRight className="w-3 h-3" />
          </Link>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
          {list.slice(0, 5).map((ed, i) => (
            <motion.div key={ed.id}
              initial={{ opacity: 0, y: 16 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: "-40px" }}
              transition={{ delay: i * 0.06, duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
              className="flex flex-col items-center text-center p-4 rounded-2xl border border-gray-100 hover:border-gray-200 hover:shadow-sm transition-all group cursor-pointer">
              <div className="relative mb-3">
                <div className="w-12 h-12 rounded-2xl flex items-center justify-center text-white font-black text-sm shadow-md"
                  style={{ background: `linear-gradient(135deg, ${RANK_COLORS[i]}cc, ${RANK_COLORS[i]}88)` }}>
                  {ed.initials}
                </div>
                <span className="absolute -top-2 -right-2 text-sm">{RANK_BADGES[i]}</span>
              </div>
              <p className="text-sm font-bold text-gray-900 group-hover:text-[var(--brand-client)] transition-colors">{ed.name}</p>
              <p className="text-[10px] text-gray-400 mb-2 truncate max-w-[9rem]">{ed.niche ?? "Video Editing"}</p>
              <div className="flex items-center gap-1 text-[11px] text-amber-500 font-bold">
                <Star className="w-3 h-3 fill-amber-400 text-amber-400" />
                {ed.avgRating?.toFixed(1) ?? "—"}
              </div>
              <p className="text-[10px] text-gray-300 mt-0.5">{ed.totalOrders} orders</p>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}

/* ════════════════════════════════════════════════════════════════════════════
   COMPARISON TABLE — EditBridge vs DM Freelancer vs Agency
════════════════════════════════════════════════════════════════════════════ */
const COMPARISON_ROWS: { feature: string; icon: React.ElementType; eb: boolean; diy: boolean; ag: boolean }[] = [
  { feature: "Payment protection",   icon: Lock,           eb: true,  diy: false, ag: true  },
  { feature: "KYC-verified editor",  icon: ShieldCheck,    eb: true,  diy: false, ag: true  },
  { feature: "Escrow (not upfront)", icon: FileCheck,      eb: true,  diy: false, ag: false },
  { feature: "Free revisions",       icon: CheckCircle,    eb: true,  diy: false, ag: false },
  { feature: "Dispute resolution",   icon: MessageSquare,  eb: true,  diy: false, ag: true  },
  { feature: "Transparent pricing",  icon: TrendingUp,     eb: true,  diy: true,  ag: false },
  { feature: "Fast turnaround",      icon: Zap,            eb: true,  diy: true,  ag: false },
  { feature: "India-native (INR)",   icon: Star,           eb: true,  diy: true,  ag: false },
];

export function ComparisonSection() {
  const [mobileTab, setMobileTab] = useState<"diy"|"ag"|"eb">("eb");
  const total = COMPARISON_ROWS.length;
  const ebCount  = COMPARISON_ROWS.filter(r => r.eb).length;
  const diyCount = COMPARISON_ROWS.filter(r => r.diy).length;
  const agCount  = COMPARISON_ROWS.filter(r => r.ag).length;
  const MOBILE_TABS: { key: "diy"|"ag"|"eb"; label: string; highlight: boolean }[] = [
    { key: "diy", label: "DM Freelancer", highlight: false },
    { key: "ag",  label: "Agency",        highlight: false },
    { key: "eb",  label: "EditBridge",    highlight: true  },
  ];

  return (
    <section className="relative bg-[#060A14] py-10 md:py-16 px-6 overflow-hidden">
      {/* ambient glow */}
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[700px] h-[500px] bg-sky-500/[0.04] rounded-full blur-3xl" />
      </div>

      <div className="max-w-5xl mx-auto relative">
        {/* ── Heading ── */}
        <Reveal className="text-center mb-20">
          <div className="inline-flex items-center gap-2 bg-sky-500/10 border border-sky-500/20 rounded-full px-4 py-1.5 mb-6">
            <span className="w-1.5 h-1.5 rounded-full bg-sky-400 animate-pulse inline-block" />
            <span className="text-xs font-semibold text-sky-400 uppercase tracking-[0.18em]">Why EditBridge</span>
          </div>
          <h2 className="text-4xl sm:text-5xl lg:text-6xl font-black text-white tracking-tight leading-[1.05]">
            Every edge.<br />
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-sky-400 to-cyan-300">In one platform.</span>
          </h2>
          <p className="mt-5 text-gray-500 text-base max-w-sm mx-auto leading-relaxed">
            A clear-eyed look at how we stack up against your other options.
          </p>
        </Reveal>

        {/* ── Mobile tab view (sm and below) ── */}
        <Reveal delay={0.08} className="sm:hidden mb-8">
          <div className="flex rounded-2xl overflow-hidden border border-white/[0.08] mb-5">
            {MOBILE_TABS.map(tab => (
              <button key={tab.key} onClick={() => setMobileTab(tab.key)}
                className={cn("flex-1 py-3 text-xs font-bold transition-colors",
                  mobileTab === tab.key
                    ? tab.highlight ? "bg-sky-500 text-white" : "bg-white/10 text-white"
                    : "text-gray-500 hover:text-gray-400"
                )}>
                {tab.label}
              </button>
            ))}
          </div>
          <div className="rounded-2xl border border-white/[0.06] overflow-hidden">
            {COMPARISON_ROWS.map((row, i) => {
              const Icon = row.icon;
              const val = row[mobileTab];
              const isLast = i === COMPARISON_ROWS.length - 1;
              return (
                <div key={row.feature}
                  className={cn("flex items-center justify-between px-4 py-3.5 gap-3",
                    i % 2 === 0 ? "bg-[#080C15]" : "bg-[#060A12]",
                    !isLast && "border-b border-white/[0.04]"
                  )}>
                  <div className="flex items-center gap-2.5">
                    <Icon className="w-3.5 h-3.5 text-gray-600 shrink-0" />
                    <span className="text-sm text-gray-400 font-medium">{row.feature}</span>
                  </div>
                  {val ? (
                    <div className={cn("w-6 h-6 rounded-full flex items-center justify-center shrink-0",
                      mobileTab === "eb" ? "bg-[var(--brand-client)]" : "bg-emerald-500/10 border border-emerald-500/20"
                    )} style={mobileTab === "eb" ? { boxShadow: "0 0 10px rgba(14,165,233,0.4)" } : {}}>
                      <Check className={cn("w-3 h-3", mobileTab === "eb" ? "text-white" : "text-emerald-500")} strokeWidth={3} />
                    </div>
                  ) : (
                    <div className="w-6 h-6 rounded-full bg-white/[0.03] flex items-center justify-center shrink-0">
                      <X className="w-3 h-3 text-gray-700" />
                    </div>
                  )}
                </div>
              );
            })}
          </div>
          <div className={cn("mt-4 rounded-2xl p-4 text-center border",
            mobileTab === "eb" ? "bg-sky-500/10 border-sky-500/30" : "bg-white/[0.02] border-white/[0.06]"
          )}>
            <div className={cn("text-xl font-black tabular-nums", mobileTab === "eb" ? "text-sky-400" : "text-gray-500")}>
              {mobileTab === "eb" ? ebCount : mobileTab === "diy" ? diyCount : agCount}
              <span className={cn("text-sm font-medium", mobileTab === "eb" ? "text-sky-600" : "text-gray-700")}>/{total} features</span>
            </div>
            <div className={cn("text-xs mt-0.5", mobileTab === "eb" ? "text-sky-500 font-semibold" : "text-gray-700")}>
              {MOBILE_TABS.find(t => t.key === mobileTab)?.label}
            </div>
          </div>
        </Reveal>

        {/* ── Desktop table ── */}
        <Reveal delay={0.08} className="hidden sm:block">
          <div className="overflow-x-auto -mx-6 px-6">
            <div className="min-w-[580px]">

              {/* Column headers */}
              <div className="grid grid-cols-4 items-end mb-0">
                <div className="pb-5 pl-3 text-[10px] font-bold text-gray-600 uppercase tracking-[0.2em]">
                  Feature
                </div>

                {/* DM Freelancer header */}
                <div className="pb-5 flex flex-col items-center gap-1">
                  <span className="text-sm font-bold text-gray-600">DM Freelancer</span>
                  <span className="text-[11px] text-gray-700 tabular-nums">{diyCount}/{total} match</span>
                </div>

                {/* Agency header */}
                <div className="pb-5 flex flex-col items-center gap-1">
                  <span className="text-sm font-bold text-gray-600">Agency</span>
                  <span className="text-[11px] text-gray-700 tabular-nums">{agCount}/{total} match</span>
                </div>

                {/* EditBridge header — elevated card top */}
                <div className="relative flex flex-col items-center">
                  <div className="absolute -top-5 left-1/2 -translate-x-1/2 whitespace-nowrap bg-gradient-to-r from-sky-500 to-cyan-400 text-white text-[10px] font-black uppercase tracking-[0.15em] px-3.5 py-1.5 rounded-full shadow-lg shadow-sky-500/40 z-20">
                    Best Pick
                  </div>
                  <div
                    className="w-full rounded-t-2xl border-t border-x border-sky-500/30 bg-gradient-to-b from-sky-500/[0.18] to-sky-500/[0.06] px-4 py-5 text-center relative z-10"
                    style={{ boxShadow: "0 -12px 48px rgba(14,165,233,0.18), inset 0 1px 0 rgba(14,165,233,0.4)" }}
                  >
                    <span className="text-base font-black text-white">EditBridge</span>
                    <div className="text-[11px] text-sky-400 mt-0.5 font-semibold tabular-nums">{ebCount}/{total} match</div>
                  </div>
                </div>
              </div>

              {/* Body rows */}
              <div className="rounded-b-2xl overflow-hidden border border-white/[0.06] border-t-0">
                {COMPARISON_ROWS.map((row, i) => {
                  const Icon = row.icon;
                  const isLast = i === total - 1;
                  return (
                    <motion.div
                      key={row.feature}
                      initial={{ opacity: 0, x: -14 }}
                      whileInView={{ opacity: 1, x: 0 }}
                      viewport={{ once: true, margin: "-30px" }}
                      transition={{ delay: i * 0.045, duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
                      className={cn(
                        "grid grid-cols-4 group transition-colors duration-150",
                        i % 2 === 0 ? "bg-[#080C15]" : "bg-[#060A12]",
                        !isLast && "border-b border-white/[0.04]",
                      )}
                    >
                      {/* Feature label */}
                      <div className="px-3 py-4 flex items-center gap-3">
                        <div className="w-7 h-7 rounded-lg bg-white/[0.04] flex items-center justify-center shrink-0">
                          <Icon className="w-3.5 h-3.5 text-gray-500" />
                        </div>
                        <span className="text-sm text-gray-400 font-medium leading-tight">{row.feature}</span>
                      </div>

                      {/* DM Freelancer */}
                      <div className="py-4 flex items-center justify-center">
                        {row.diy ? (
                          <div className="w-6 h-6 rounded-full bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center">
                            <Check className="w-3 h-3 text-emerald-500" />
                          </div>
                        ) : (
                          <div className="w-6 h-6 rounded-full bg-white/[0.03] flex items-center justify-center">
                            <X className="w-3 h-3 text-gray-700" />
                          </div>
                        )}
                      </div>

                      {/* Agency */}
                      <div className="py-4 flex items-center justify-center">
                        {row.ag ? (
                          <div className="w-6 h-6 rounded-full bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center">
                            <Check className="w-3 h-3 text-emerald-500" />
                          </div>
                        ) : (
                          <div className="w-6 h-6 rounded-full bg-white/[0.03] flex items-center justify-center">
                            <X className="w-3 h-3 text-gray-700" />
                          </div>
                        )}
                      </div>

                      {/* EditBridge — always ✓, glowing column */}
                      <div className={cn(
                        "py-4 flex items-center justify-center border-x border-sky-500/20 transition-colors duration-150 bg-sky-500/[0.05] group-hover:bg-sky-500/[0.09]",
                        isLast && "rounded-b-2xl border-b border-sky-500/20",
                      )}>
                        <motion.div
                          initial={{ scale: 0, rotate: -10 }}
                          whileInView={{ scale: 1, rotate: 0 }}
                          viewport={{ once: true }}
                          transition={{ delay: i * 0.045 + 0.18, duration: 0.38, ease: [0.34, 1.56, 0.64, 1] }}
                          className="w-7 h-7 rounded-full bg-[var(--brand-client)] flex items-center justify-center"
                          style={{ boxShadow: "0 0 14px rgba(14,165,233,0.45)" }}
                        >
                          <Check className="w-3.5 h-3.5 text-white" strokeWidth={3} />
                        </motion.div>
                      </div>
                    </motion.div>
                  );
                })}
              </div>
            </div>
          </div>
        </Reveal>

        {/* ── Score summary cards ── */}
        <Reveal delay={0.25} className="mt-6 grid grid-cols-3 gap-3 max-w-2xl mx-auto">
          {[
            { label: "DM Freelancer", count: diyCount, highlight: false },
            { label: "Agency",        count: agCount,  highlight: false },
            { label: "EditBridge",    count: ebCount,  highlight: true  },
          ].map(col => (
            <div key={col.label} className={cn(
              "rounded-2xl p-4 text-center border",
              col.highlight
                ? "bg-sky-500/10 border-sky-500/30"
                : "bg-white/[0.02] border-white/[0.06]",
            )}>
              <div className={cn("text-2xl font-black tabular-nums", col.highlight ? "text-sky-400" : "text-gray-600")}>
                {col.count}
                <span className={cn("text-sm font-medium", col.highlight ? "text-sky-600" : "text-gray-700")}>/{total}</span>
              </div>
              <div className={cn("text-xs mt-0.5 font-medium", col.highlight ? "text-sky-500" : "text-gray-700")}>{col.label}</div>
            </div>
          ))}
        </Reveal>

        {/* ── CTA ── */}
        <Reveal delay={0.35} className="text-center mt-10">
          <MagBtn className="inline-block">
            <Link href="/browse"
              className="inline-flex items-center gap-2 bg-[var(--brand-client)] hover:bg-[var(--brand-client-hover)] text-white font-black px-8 py-3.5 rounded-2xl text-sm transition-colors shadow-lg shadow-sky-500/25">
              Find your editor <ArrowRight className="w-4 h-4" />
            </Link>
          </MagBtn>
        </Reveal>
      </div>
    </section>
  );
}

/* ════════════════════════════════════════════════════════════════════════════
   PRICING PREVIEW — 3-tier transparency row
════════════════════════════════════════════════════════════════════════════ */
const PRICING_TIERS = [
  {
    name: "Basic",
    range: "₹800 – ₹2,500",
    desc: "Quick turnaround edits — Reels, Shorts, simple cuts.",
    features: ["1–2 minute output", "Delivery in 24–48h", "1 revision included"],
    col: "var(--brand-teal)",
    popular: false,
  },
  {
    name: "Standard",
    range: "₹2,500 – ₹8,000",
    desc: "YouTube long-form, podcast edits, branded content.",
    features: ["5–20 minute output", "Colour grading", "2–3 revisions", "Source files"],
    col: "var(--brand-client)",
    popular: true,
  },
  {
    name: "Premium",
    range: "₹8,000 – ₹25,000+",
    desc: "Brand campaigns, corporate ads, VFX-heavy productions.",
    features: ["Any length", "VFX & motion graphics", "Unlimited revisions", "Dedicated editor"],
    col: "var(--brand-editor)",
    popular: false,
  },
];

export function PricingPreviewSection() {
  return (
    <section className="bg-white py-8 md:py-14 px-6">
      <div className="max-w-5xl mx-auto">
        <Reveal className="text-center mb-8">
          <div className="flex items-center justify-center gap-3 mb-4"><div className="h-px w-10 bg-gray-200"/><span className="text-[10px] font-black text-gray-400 uppercase tracking-[0.28em]">Transparent pricing</span><div className="h-px w-10 bg-gray-200"/></div>
          <h2 className="text-4xl sm:text-5xl font-black text-gray-900 tracking-tight leading-none mb-4">
            Know what you pay.<br /><span className="text-gray-200">Before you book.</span>
          </h2>
          <p className="text-gray-400 max-w-lg mx-auto text-base">No hidden platform fees. No surprises. Editors set their own rates — you see the full price upfront.</p>
        </Reveal>

        <div className="grid sm:grid-cols-3 gap-5">
          {PRICING_TIERS.map((tier, i) => (
            <Reveal key={tier.name} delay={i * 0.08}>
              <div className={cn(
                "relative rounded-3xl p-8 flex flex-col h-full border transition-all",
                tier.popular
                  ? "border-[var(--brand-client)]/30 shadow-xl shadow-sky-500/10"
                  : "border-gray-100 hover:border-gray-200"
              )}>
                {tier.popular && (
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                    <span className="bg-[var(--brand-client)] text-white text-[10px] font-black px-4 py-1.5 rounded-full uppercase tracking-wider shadow-lg shadow-sky-500/30">
                      Most popular
                    </span>
                  </div>
                )}
                <div className="w-10 h-10 rounded-2xl mb-6 flex items-center justify-center" style={{ background: `${tier.col}15` }}>
                  <div className="w-3 h-3 rounded-full" style={{ background: tier.col }} />
                </div>
                <p className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-1">{tier.name}</p>
                <p className="text-2xl font-black text-gray-900 mb-3">{tier.range}</p>
                <p className="text-sm text-gray-400 leading-relaxed mb-6 flex-1">{tier.desc}</p>
                <ul className="space-y-2.5 mb-8">
                  {tier.features.map(f => (
                    <li key={f} className="flex items-center gap-2.5 text-sm text-gray-600">
                      <div className="w-4 h-4 rounded-full flex items-center justify-center shrink-0" style={{ background: `${tier.col}15` }}>
                        <Check className="w-2.5 h-2.5" style={{ color: tier.col }} />
                      </div>
                      {f}
                    </li>
                  ))}
                </ul>
                <Link href="/pricing"
                  className="inline-flex items-center justify-center gap-1.5 text-sm font-bold py-3 rounded-xl transition-all"
                  style={tier.popular ? { background: tier.col, color: "white", boxShadow: `0 8px 24px ${tier.col}40` } : { border: `1px solid ${tier.col}30`, color: tier.col }}>
                  See all packages <ArrowRight className="w-3.5 h-3.5" />
                </Link>
              </div>
            </Reveal>
          ))}
        </div>

        <Reveal className="text-center mt-10">
          <p className="text-xs text-gray-400">4% processing fee charged to clients · 15% commission deducted from editor payout · All prices in INR</p>
        </Reveal>
      </div>
    </section>
  );
}

/* ════════════════════════════════════════════════════════════════════════════
   FOR EDITORS — two-sided acquisition band
════════════════════════════════════════════════════════════════════════════ */
export function ForEditorsSection() {
  return (
    <section className="bg-gray-950 py-8 md:py-14 px-6 overflow-hidden">
      <div className="max-w-7xl mx-auto grid md:grid-cols-2 gap-0 rounded-3xl overflow-hidden border border-white/[0.06]">
        {/* Client side */}
        <Reveal from="left">
          <div className="relative p-7 lg:p-14 h-full flex flex-col justify-between overflow-hidden" style={{ background: "linear-gradient(135deg, #0EA5E9 0%, #0284C7 100%)" }}>
            <div className="absolute inset-0 opacity-[0.07]" style={{ backgroundImage: "radial-gradient(rgba(255,255,255,0.9) 1px, transparent 1px)", backgroundSize: "20px 20px" }} />
            <div className="absolute -top-20 -right-20 w-64 h-64 rounded-full opacity-20" style={{ background: "radial-gradient(ellipse, #ffffff, transparent 70%)" }} />
            <div className="relative">
              <p className="text-[10px] font-black text-white/50 uppercase tracking-[0.28em] mb-6">For clients</p>
              <h3 className="text-3xl lg:text-4xl font-black text-white leading-tight mb-5">
                Great content<br />starts with great<br />editing.
              </h3>
              <p className="text-white/70 text-base leading-relaxed mb-8 max-w-sm">
                Post your project in minutes. Get proposals from KYC-verified editors. Pay only when you're happy — every order is protected.
              </p>
              <ul className="space-y-3 mb-10">
                {["Payment held in escrow until you approve", "Free revisions on every package", "Dispute resolution if anything goes wrong"].map(item => (
                  <li key={item} className="flex items-start gap-3 text-sm text-white/80">
                    <CheckCircle className="w-4 h-4 text-white/60 shrink-0 mt-0.5" />
                    {item}
                  </li>
                ))}
              </ul>
            </div>
            <Link href="/browse"
              className="inline-flex items-center gap-2 self-start bg-white text-[#0284C7] font-black px-7 py-3.5 rounded-2xl text-sm hover:bg-blue-50 transition-colors shadow-xl">
              Find your editor <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
        </Reveal>

        {/* Editor side */}
        <Reveal from="right">
          <div className="relative p-7 lg:p-14 h-full flex flex-col justify-between overflow-hidden border-t md:border-t-0 md:border-l border-white/[0.06]" style={{ background: "linear-gradient(135deg, #1a1030 0%, #0d0d1a 100%)" }}>
            <div className="absolute inset-0 opacity-[0.05]" style={{ backgroundImage: "radial-gradient(rgba(124,58,237,0.8) 1px, transparent 1px)", backgroundSize: "20px 20px" }} />
            <div className="absolute -bottom-20 -left-20 w-64 h-64 rounded-full opacity-15" style={{ background: "radial-gradient(ellipse, var(--brand-editor), transparent 70%)" }} />
            <div className="relative">
              <p className="text-[10px] font-black text-[var(--brand-editor)]/60 uppercase tracking-[0.28em] mb-6">For editors</p>
              <h3 className="text-3xl lg:text-4xl font-black text-white leading-tight mb-5">
                Turn your skills<br />into steady<br />income.
              </h3>
              <p className="text-white/50 text-base leading-relaxed mb-8 max-w-sm">
                Set your own rates, pick the briefs you like, and get paid on time — every time. No invoice chasing, no client ghosting.
              </p>
              <ul className="space-y-3 mb-10">
                {["Guaranteed payment via escrow — always", "Keep 85% of every order value", "Verified profile builds trust & credibility"].map(item => (
                  <li key={item} className="flex items-start gap-3 text-sm text-white/60">
                    <CheckCircle className="w-4 h-4 text-[var(--brand-editor)]/70 shrink-0 mt-0.5" />
                    {item}
                  </li>
                ))}
              </ul>
            </div>
            <Link href="/signup/editor"
              className="inline-flex items-center gap-2 self-start bg-[var(--brand-editor)] hover:bg-[var(--brand-editor-hover)] text-white font-black px-7 py-3.5 rounded-2xl text-sm transition-colors shadow-lg shadow-violet-900/40">
              Apply as Editor <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
        </Reveal>
      </div>
    </section>
  );
}

/* ════════════════════════════════════════════════════════════════════════════
   EDITOR EARNINGS CALCULATOR — interactive slider, live output
════════════════════════════════════════════════════════════════════════════ */
export function EditorEarningsCalculator() {
  const [ordersPerMonth, setOrdersPerMonth] = useState(5);
  const [avgPrice, setAvgPrice] = useState(3000);
  const reduced = useReducedMotion();

  const gross = ordersPerMonth * avgPrice;
  const commission = Math.round(gross * 0.15);
  const net = gross - commission;
  const annual = net * 12;
  const fmt = (n: number) => `₹${n.toLocaleString("en-IN")}`;

  const rows = [
    { label: "Gross monthly",      val: fmt(gross),       sub: `${ordersPerMonth} × ₹${avgPrice.toLocaleString("en-IN")}`,  col: "#ffffff",  bg: "rgba(255,255,255,0.04)",  border: "rgba(255,255,255,0.08)"  },
    { label: "Platform fee (15%)", val: `-${fmt(commission)}`, sub: "Kept by EditBridge",                                   col: "#f87171",  bg: "rgba(239,68,68,0.06)",    border: "rgba(239,68,68,0.12)"    },
    { label: "You keep",           val: fmt(net),          sub: "Net monthly payout",                                        col: "#a78bfa",  bg: "rgba(124,58,237,0.08)",   border: "rgba(124,58,237,0.20)"   },
    { label: "Annual projection",  val: fmt(annual),       sub: "At this pace, per year",                                    col: "#34d399",  bg: "rgba(15,110,86,0.08)",    border: "rgba(15,110,86,0.20)"    },
  ];

  return (
    <section className="bg-gray-950 py-8 md:py-14 px-6 overflow-hidden">
      <div className="max-w-4xl mx-auto">
        <Reveal className="text-center mb-8">
          <div className="flex items-center justify-center gap-3 mb-5">
            <div className="h-px w-10" style={{ background: "rgba(124,58,237,0.4)" }} />
            <span className="text-[10px] font-black text-[var(--brand-editor)] uppercase tracking-[0.28em]">For editors</span>
            <div className="h-px w-10" style={{ background: "rgba(124,58,237,0.4)" }} />
          </div>
          <h2 className="text-4xl sm:text-5xl font-black text-white tracking-tight leading-none mb-4">
            See what you&apos;d<br /><span style={{ color: "#a78bfa" }}>take home.</span>
          </h2>
          <p className="text-white/40 text-base max-w-xs mx-auto">
            Set your rates, see your net payout after our 15% platform commission.
          </p>
        </Reveal>

        <div className="grid md:grid-cols-2 gap-6 items-start">
          {/* Sliders */}
          <Reveal from="left">
            <div className="rounded-3xl p-8 space-y-10 border" style={{ background: "rgba(255,255,255,0.03)", borderColor: "rgba(255,255,255,0.07)" }}>
              {/* Orders per month */}
              <div>
                <div className="flex items-center justify-between mb-4">
                  <label className="text-white/60 text-sm font-semibold">Orders / month</label>
                  <span className="text-3xl font-black text-white tabular-nums">{ordersPerMonth}</span>
                </div>
                <input type="range" min={1} max={20} step={1} value={ordersPerMonth}
                  onChange={e => setOrdersPerMonth(Number(e.target.value))}
                  className="w-full h-1.5 rounded-full appearance-none cursor-pointer"
                  style={{ accentColor: "var(--brand-editor)", background: `linear-gradient(to right, var(--brand-editor) ${((ordersPerMonth - 1) / 19) * 100}%, rgba(255,255,255,0.1) 0%)` }} />
                <div className="flex justify-between text-[11px] mt-2" style={{ color: "rgba(255,255,255,0.2)" }}>
                  <span>1 order</span><span>20 orders</span>
                </div>
              </div>

              {/* Avg package price */}
              <div>
                <div className="flex items-center justify-between mb-4">
                  <label className="text-white/60 text-sm font-semibold">Avg. package price</label>
                  <span className="text-3xl font-black text-white tabular-nums">₹{avgPrice.toLocaleString("en-IN")}</span>
                </div>
                <input type="range" min={500} max={20000} step={100} value={avgPrice}
                  onChange={e => setAvgPrice(Number(e.target.value))}
                  className="w-full h-1.5 rounded-full appearance-none cursor-pointer"
                  style={{ accentColor: "var(--brand-editor)", background: `linear-gradient(to right, var(--brand-editor) ${((avgPrice - 500) / 19500) * 100}%, rgba(255,255,255,0.1) 0%)` }} />
                <div className="flex justify-between text-[11px] mt-2" style={{ color: "rgba(255,255,255,0.2)" }}>
                  <span>₹500</span><span>₹20,000</span>
                </div>
              </div>
            </div>
          </Reveal>

          {/* Results */}
          <Reveal from="right">
            <div className="space-y-3">
              {rows.map(({ label, val, sub, col, bg, border }) => (
                <div key={label} className="rounded-2xl p-5 flex items-center justify-between border"
                  style={{ background: bg, borderColor: border }}>
                  <div>
                    <p className="text-white/40 text-xs font-medium">{label}</p>
                    <p className="text-[11px] mt-0.5" style={{ color: "rgba(255,255,255,0.2)" }}>{sub}</p>
                  </div>
                  <motion.span key={val}
                    initial={reduced ? {} : { opacity: 0, y: 6 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.2 }}
                    className="text-xl font-black tabular-nums" style={{ color: col }}>
                    {val}
                  </motion.span>
                </div>
              ))}
              <div className="pt-2">
                <Link href="/signup/editor"
                  className="w-full inline-flex items-center justify-center gap-2 bg-[var(--brand-editor)] hover:bg-[var(--brand-editor-hover)] text-white font-black px-7 py-3.5 rounded-2xl text-sm transition-colors"
                  style={{ boxShadow: "0 8px 32px rgba(124,58,237,0.35)" }}>
                  Start earning — Apply as Editor <ArrowRight className="w-4 h-4" />
                </Link>
              </div>
            </div>
          </Reveal>
        </div>
      </div>
    </section>
  );
}

/* ════════════════════════════════════════════════════════════════════════════
   BLOG PREVIEW — 2-3 latest published posts
════════════════════════════════════════════════════════════════════════════ */
interface BlogPost {
  id: string;
  title: string;
  slug: string;
  excerpt: string;
  category: string;
  readTime: string;
  publishedAt: Date | null;
}

export function BlogPreviewSection({ posts }: { posts: BlogPost[] }) {
  const items = posts.length > 0 ? posts : [
    { id: "1", title: "How to Write a Video Editing Brief That Gets Results", slug: "how-to-write-a-brief", excerpt: "A clear brief is the difference between two revision rounds and ten. Here's what to include — and what to skip.", category: "For Clients", readTime: "4 min read", publishedAt: null },
    { id: "2", title: "YouTube vs Reels vs Shorts: Which Niche Pays Editors More?", slug: "youtube-reels-shorts-editor-pay", excerpt: "We analysed 500+ orders on EditBridge to see which content type commands higher packages and repeat clients.", category: "Insights", readTime: "6 min read", publishedAt: null },
    { id: "3", title: "5 Signs Your Video Editor Isn't Right for Your Channel", slug: "5-signs-wrong-editor", excerpt: "Missing deadlines is obvious. These subtler signs are what experienced creators watch for before ending a relationship.", category: "For Clients", readTime: "5 min read", publishedAt: null },
  ];

  const CAT_COLORS: Record<string, string> = {
    "For Clients": "var(--brand-client)",
    "For Editors": "var(--brand-editor)",
    "Insights":    "var(--brand-teal)",
    "Platform":    "#F59E0B",
  };

  return (
    <section className="bg-gray-50 py-8 md:py-14 px-6">
      <div className="max-w-7xl mx-auto">
        <div className="flex items-end justify-between mb-12 flex-wrap gap-6">
          <Reveal>
            <div className="flex items-center gap-3 mb-4"><div className="h-px w-10 bg-gray-300"/><span className="text-[10px] font-black text-gray-400 uppercase tracking-[0.28em]">From the blog</span></div>
            <h2 className="text-4xl sm:text-5xl font-black text-gray-900 tracking-tight leading-none">
              Guides, tips,<br /><span className="text-gray-200">and insights.</span>
            </h2>
          </Reveal>
          <Reveal delay={0.1}>
            <Link href="/blog" className="inline-flex items-center gap-2 border border-gray-200 text-gray-500 hover:text-[var(--brand-client)] hover:border-[var(--brand-client)]/30 text-sm font-medium px-5 py-2.5 rounded-xl transition-all">
              All posts <ArrowUpRight className="w-4 h-4"/>
            </Link>
          </Reveal>
        </div>

        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {items.slice(0, 3).map((post, i) => {
            const catCol = CAT_COLORS[post.category] ?? "#6B7280";
            return (
              <Reveal key={post.id} delay={i * 0.08}>
                <Link href={`/blog/${post.slug}`} className="group flex flex-col h-full bg-white rounded-3xl border border-gray-100 p-7 hover:shadow-lg hover:border-gray-200 transition-all">
                  <div className="flex items-center gap-2 mb-5">
                    <span className="text-[10px] font-bold px-3 py-1 rounded-full" style={{ background: `${catCol}12`, color: catCol }}>{post.category}</span>
                    <span className="text-[10px] text-gray-300">{post.readTime}</span>
                  </div>
                  <h3 className="text-base font-black text-gray-900 leading-snug mb-3 group-hover:text-[var(--brand-client)] transition-colors flex-1">
                    {post.title}
                  </h3>
                  <p className="text-sm text-gray-400 leading-relaxed mb-6">{post.excerpt}</p>
                  <div className="flex items-center gap-1.5 text-[var(--brand-client)] text-xs font-bold mt-auto">
                    Read more <ArrowRight className="w-3 h-3 group-hover:translate-x-1 transition-transform" />
                  </div>
                </Link>
              </Reveal>
            );
          })}
        </div>
      </div>
    </section>
  );
}

/* ════════════════════════════════════════════════════════════════════════════
   FAQ  (Fix 21)
════════════════════════════════════════════════════════════════════════════ */
const FAQ_ITEMS = [
  {
    q: "What if the editor delivers terrible work?",
    a: "Your payment stays locked in escrow until you explicitly approve the delivery. If the work misses the mark, you can request revisions (included in every package at no extra charge). If the editor still falls short after revisions, raise a dispute — our team reviews both sides and issues a full refund if the editor failed to meet your brief.",
  },
  {
    q: "How does KYC verification actually work?",
    a: "Every editor submits a government-issued ID (Aadhaar, PAN, or passport) before listing any services. Our team manually reviews and approves each submission. The verified badge on a profile means a real, named individual with a confirmed identity is behind it — not an anonymous account. Editors who fail verification are permanently removed.",
  },
  {
    q: "What counts as a revision?",
    a: "A revision is any change to the delivered video within your original brief — pacing, colour grade, cuts, music swaps, text overlays, removing/adding clips, and more. Scope creep (entirely new footage, completely different style direction beyond the original brief) may be quoted separately, but your editor is obligated to fully match the original brief before any extras apply.",
  },
  {
    q: "How long until I receive my file?",
    a: "Delivery timelines are shown on every editor's profile and locked in when you place the order. Most packages deliver in 2–5 business days; express 24hr editors are also available. Once the editor marks delivery, your files are available to download immediately — no email attachments, no waiting.",
  },
];

export function AnimatedFAQ() {
  const [open, setOpen] = useState<number | null>(null);
  return (
    <section className="bg-gray-50 py-8 md:py-14 px-6">
      <div className="max-w-3xl mx-auto">
        <Reveal className="text-center mb-12">
          <div className="flex items-center justify-center gap-3 mb-5">
            <div className="h-px w-10 bg-[var(--brand-client)]" />
            <span className="text-[10px] font-black text-[var(--brand-client)] uppercase tracking-[0.28em]">Common questions</span>
            <div className="h-px w-10 bg-[var(--brand-client)]" />
          </div>
          <h2 className="text-3xl sm:text-5xl font-black text-gray-900 tracking-tight leading-tight">
            Questions before<br /><span className="text-gray-300">you commit.</span>
          </h2>
        </Reveal>
        <div className="space-y-3">
          {FAQ_ITEMS.map(({ q, a }, i) => (
            <Reveal key={q} delay={i * 0.06}>
              <div className="bg-white border border-gray-100 rounded-2xl overflow-hidden shadow-sm">
                <button
                  onClick={() => setOpen(open === i ? null : i)}
                  className="w-full flex items-center justify-between gap-4 px-6 py-5 text-left group">
                  <span className="font-bold text-gray-900 text-base leading-snug">{q}</span>
                  <motion.div
                    animate={{ rotate: open === i ? 45 : 0 }}
                    transition={{ duration: 0.22, ease: [0.22, 1, 0.36, 1] }}
                    className="shrink-0 w-6 h-6 rounded-full border border-gray-200 group-hover:border-gray-400 flex items-center justify-center transition-colors">
                    <Check className="w-3 h-3 text-gray-400 group-hover:text-gray-600 transition-colors" strokeWidth={2.5} />
                  </motion.div>
                </button>
                <AnimatePresence initial={false}>
                  {open === i && (
                    <motion.div
                      key="answer"
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: "auto", opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      transition={{ duration: 0.32, ease: [0.22, 1, 0.36, 1] }}>
                      <div className="px-6 pb-6 border-t border-gray-50">
                        <p className="text-gray-500 text-sm leading-relaxed mt-4">{a}</p>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            </Reveal>
          ))}
        </div>
        <Reveal delay={0.3} className="mt-10 text-center">
          <p className="text-sm text-gray-400">
            Still unsure?{" "}
            <Link href="/help" className="text-[var(--brand-client)] font-semibold hover:underline">Read our full Help Centre →</Link>
          </p>
        </Reveal>
      </div>
    </section>
  );
}

/* ════════════════════════════════════════════════════════════════════════════
   CTA
════════════════════════════════════════════════════════════════════════════ */
/* ════════════════════════════════════════════════════════════════════════════
   STICKY BOTTOM CTA BAR — appears after scrolling past the hero fold
════════════════════════════════════════════════════════════════════════════ */
export function StickyCtaBar() {
  const [visible, setVisible] = useState(false);
  const prefersReduced = useReducedMotion();

  useEffect(() => {
    const onScroll = () => setVisible(window.scrollY > 400);
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          initial={{ y: prefersReduced ? 0 : 80, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: prefersReduced ? 0 : 80, opacity: 0 }}
          transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
          className="fixed bottom-0 left-0 right-0 z-[999] pointer-events-none"
        >
          <div className="relative pointer-events-auto">
            {/* Blur backdrop */}
            <div className="absolute inset-0 bg-white/80 dark:bg-gray-900/85 backdrop-blur-md border-t border-gray-200/60 dark:border-gray-700/60" />
            <div className="relative max-w-5xl mx-auto flex items-center justify-between gap-4 px-5 py-3 sm:py-2.5">
              <p className="hidden sm:block text-sm font-semibold text-gray-700 dark:text-gray-200 shrink-0">
                Find your perfect editor today.
              </p>
              <div className="flex items-center gap-3 w-full sm:w-auto justify-center sm:justify-end">
                <Link
                  href="/browse"
                  className="inline-flex items-center gap-2 bg-[var(--brand-client)] hover:bg-[var(--brand-client-hover)] text-white text-sm font-bold px-5 py-2.5 rounded-xl transition-colors shadow-lg shadow-sky-500/20"
                >
                  Browse Editors <ArrowRight className="w-3.5 h-3.5" />
                </Link>
                <Link
                  href="/signup/client"
                  className="inline-flex items-center gap-2 bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 text-gray-800 dark:text-gray-100 text-sm font-bold px-5 py-2.5 rounded-xl transition-colors border border-gray-200 dark:border-gray-700"
                >
                  Sign up free
                </Link>
              </div>
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

export function AnimatedCTA() {
  return (
    <section className="relative overflow-hidden bg-[var(--brand-client)] py-10 md:py-16 px-6">
      <div className="absolute inset-0 opacity-[0.12]" style={{backgroundImage:"radial-gradient(rgba(255,255,255,0.8) 1px, transparent 1px)",backgroundSize:"28px 28px"}}/>
      <svg className="absolute inset-0 w-full h-full opacity-[0.06] pointer-events-none" xmlns="http://www.w3.org/2000/svg">
        <filter id="cta-grain"><feTurbulence type="fractalNoise" baseFrequency="0.75" numOctaves="4" stitchTiles="stitch"/><feColorMatrix type="saturate" values="0"/></filter>
        <rect width="100%" height="100%" filter="url(#cta-grain)"/>
      </svg>
      {/* Slow hue-shift breathing overlay (Fix 20) */}
      <motion.div
        animate={{ backgroundPosition: ["0% 50%", "100% 50%", "0% 50%"] }}
        transition={{ duration: 9, repeat: Infinity, ease: "easeInOut" }}
        className="absolute inset-0 pointer-events-none opacity-[0.18]"
        style={{ backgroundImage: "linear-gradient(135deg, #0EA5E9 0%, var(--brand-editor) 25%, #0F6E56 50%, #F59E0B 75%, #0EA5E9 100%)", backgroundSize: "400% 400%" }}
      />
      <motion.div animate={{scale:[1,1.2,1],opacity:[0.3,0.55,0.3]}} transition={{duration:8,repeat:Infinity,ease:"easeInOut"}}
        className="absolute top-0 right-0 w-[700px] h-[600px] rounded-full pointer-events-none"
        style={{background:"radial-gradient(ellipse,#6c5ce7,transparent 65%)"}}/>
      <motion.div animate={{scale:[1.1,1,1.1],opacity:[0.2,0.38,0.2]}} transition={{duration:11,repeat:Infinity,ease:"easeInOut",delay:3}}
        className="absolute bottom-0 left-0 w-[600px] h-[500px] rounded-full pointer-events-none"
        style={{background:"radial-gradient(ellipse,#0F6E56,transparent 65%)"}}/>

      <div className="relative z-10 max-w-5xl mx-auto text-center">
        <Reveal>
          <p className="text-[10px] font-black text-white/40 uppercase tracking-[0.32em] mb-8">Get started today</p>
          <h2 className="font-black text-white tracking-tight leading-none mb-8" style={{fontSize:"clamp(3.5rem,9vw,7.5rem)"}}>
            Your next great<br />video is one<br />click away.
          </h2>
          <p className="text-white/75 text-xl mb-12 max-w-lg mx-auto leading-relaxed">KYC on every editor. Verified payment protection.<br />Revisions on every order.</p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center mb-10">
            <MagBtn>
              <Link href="/browse"
                className="relative inline-flex items-center gap-2.5 bg-white hover:bg-gray-50 text-[var(--brand-client)] font-black px-10 py-4 text-base rounded-2xl overflow-hidden group transition-all"
                style={{ boxShadow: "0 8px 32px rgba(0,0,0,0.20)" }}>
                <span className="absolute inset-0 bg-gradient-to-r from-white/0 via-white/15 to-white/0 -translate-x-full group-hover:translate-x-full transition-transform duration-700"/>
                Find your editor <ArrowRight className="w-5 h-5"/>
              </Link>
            </MagBtn>
            <MagBtn>
              <Link href="/signup/editor" className="inline-flex items-center gap-2.5 border-2 border-white/25 hover:border-white/50 text-white font-bold px-10 py-4 text-base rounded-2xl transition-all">
                Become an editor
              </Link>
            </MagBtn>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 max-w-2xl mx-auto">
            {[
              { icon: Lock,         text: "Payment in escrow" },
              { icon: ShieldCheck,  text: "KYC-verified editors" },
              { icon: CheckCircle,  text: "Revisions included" },
              { icon: Users,        text: "₹0 lost to fraud — ever" },
            ].map(({ icon: Icon, text }) => (
              <div key={text} className="flex items-center gap-2.5 bg-white/[0.07] rounded-xl px-3 py-2.5 text-left">
                <Icon className="w-4 h-4 text-white/50 shrink-0" />
                <span className="text-xs font-semibold text-white/60 leading-tight">{text}</span>
              </div>
            ))}
          </div>
        </Reveal>
      </div>
    </section>
  );
}

/* ════════════════════════════════════════════════════════════════════════════
   TRUSTED-BY PARTNER STRIP
════════════════════════════════════════════════════════════════════════════ */
const PARTNERS = [
  { name: "Razorpay Escrow",   accent: "#2D6FEB", label: "RBI-regulated payments" },
  { name: "256-bit SSL",        accent: "#059669", label: "All connections secured" },
  { name: "KYC Verified",       accent: "var(--brand-editor)", label: "Every editor, verified"  },
  { name: "Dispute Protection", accent: "#d97706", label: "Admin-mediated resolution"},
];

export function TrustedByStrip() {
  return (
    <section className="border-y border-gray-100 bg-white py-5 px-6 overflow-hidden">
      <div className="max-w-5xl mx-auto flex flex-col sm:flex-row items-center gap-4 sm:gap-8">
        <p className="text-[11px] font-black text-gray-300 uppercase tracking-widest shrink-0">Powered by</p>
        <div className="hidden sm:block h-6 w-px bg-gray-100 shrink-0" />
        <div className="flex items-center gap-8 sm:gap-12 flex-wrap justify-center">
          {PARTNERS.map(({ name, accent, label }, i) => (
            <Reveal key={name} delay={i * 0.06} className="flex items-center gap-2.5">
              <div className="w-6 h-6 rounded-lg flex items-center justify-center text-[8px] font-black text-white shadow-sm shrink-0"
                style={{ background: accent }}>
                {name[0]}
              </div>
              <div>
                <p className="text-[13px] font-bold text-gray-700 leading-none">{name}</p>
                <p className="text-[10px] text-gray-400 mt-0.5 leading-none">{label}</p>
              </div>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  );
}

/* ════════════════════════════════════════════════════════════════════════════
   COMBINED STRIP — Built-for niches + Secured-by partners in one row
════════════════════════════════════════════════════════════════════════════ */
export function CombinedStrip() {
  return (
    <section className="bg-white overflow-hidden border-y border-gray-100">
      {/* Niches row */}
      <div className="max-w-7xl mx-auto px-6 py-3 flex items-center gap-5 border-b border-gray-50">
        <span className="text-[9px] font-black text-gray-300 uppercase tracking-[0.3em] shrink-0">Built for</span>
        <div className="h-3 w-px bg-gray-100 shrink-0" />
        <div className="flex items-center gap-8 overflow-x-auto" style={{ scrollbarWidth: "none" }}>
          {NICHES_BAR.map(({ label, href }, i) => (
            <motion.span key={label} initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.06 * i, duration: 0.5 }}>
              <Link href={href} className="text-[10px] font-bold text-gray-300 uppercase tracking-[0.18em] whitespace-nowrap hover:text-[var(--brand-client)] transition-colors">
                {label}
              </Link>
            </motion.span>
          ))}
        </div>
      </div>
      {/* Trust signals row */}
      <div className="max-w-7xl mx-auto px-6 py-3 flex items-center gap-5">
        <span className="text-[9px] font-black text-gray-300 uppercase tracking-[0.3em] shrink-0">Trusted because</span>
        <div className="h-3 w-px bg-gray-100 shrink-0" />
        <div className="flex items-center gap-6 sm:gap-10 flex-wrap overflow-x-auto" style={{ scrollbarWidth: "none" }}>
          {PARTNERS.map(({ name, accent, label }, i) => (
            <Reveal key={name} delay={i * 0.06} className="flex items-center gap-2 shrink-0">
              <div className="w-5 h-5 rounded-md flex items-center justify-center text-[8px] font-black text-white shrink-0" style={{ background: accent }}>
                {name[0]}
              </div>
              <div>
                <p className="text-[11px] font-bold text-gray-600 leading-tight">{name}</p>
                <p className="text-[9px] text-gray-400 leading-tight">{label}</p>
              </div>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  );
}

/* ════════════════════════════════════════════════════════════════════════════
   PRICE ANCHOR — lightweight 3-tier "starting from" row
════════════════════════════════════════════════════════════════════════════ */
const PRICE_TIERS = [
  { label: "Reels & Shorts",    from: "₹800",   icon: Zap,         color: "#059669" },
  { label: "YouTube Long-form", from: "₹2,500", icon: TrendingUp,  color: "var(--brand-client)" },
  { label: "Brand Films",       from: "₹8,000", icon: Star,        color: "var(--brand-editor)" },
];

export function PriceAnchorSection() {
  return (
    <section className="bg-gray-50 border-b border-gray-100 py-5 px-6">
      <div className="max-w-5xl mx-auto flex flex-col sm:flex-row items-center gap-4 sm:gap-8">
        <span className="text-[11px] font-black text-gray-400 uppercase tracking-wider shrink-0">Starting from</span>
        <div className="h-px sm:h-6 w-full sm:w-px bg-gray-200 shrink-0" />
        <div className="flex items-center gap-6 sm:gap-10 flex-wrap justify-center sm:justify-start flex-1">
          {PRICE_TIERS.map(({ label, from, icon: Icon, color }) => (
            <Link href="/browse" key={label} className="flex items-center gap-2.5 group">
              <div className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0" style={{ background: `${color}12` }}>
                <Icon className="w-4 h-4" style={{ color }} />
              </div>
              <div>
                <p className="text-[10px] text-gray-400 font-medium leading-tight">{label}</p>
                <p className="text-sm font-black text-gray-800 group-hover:text-[var(--brand-client)] transition-colors leading-tight">{from}</p>
              </div>
            </Link>
          ))}
        </div>
        <Link href="/pricing" className="text-xs text-[var(--brand-client)] font-semibold hover:underline shrink-0 whitespace-nowrap">
          All pricing →
        </Link>
      </div>
    </section>
  );
}

/* ════════════════════════════════════════════════════════════════════════════
   URGENCY SIGNAL — available editors count
════════════════════════════════════════════════════════════════════════════ */
export function UrgencySignal({ count }: { count: number }) {
  if (count === 0) return null;
  return (
    <div className="flex justify-center pt-2 pb-1 px-6 bg-white">
      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ delay: 1.0, duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
        className="inline-flex items-center gap-2.5 bg-emerald-50 border border-emerald-100 rounded-full px-4 py-2">
        <span className="relative flex h-2 w-2 shrink-0">
          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
          <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-500" />
        </span>
        <span className="text-sm font-semibold text-emerald-700">
          {count} editor{count !== 1 ? "s" : ""} accepting orders right now
        </span>
      </motion.div>
    </div>
  );
}

/* ════════════════════════════════════════════════════════════════════════════
   GUARANTEE BAR — money-back callout
════════════════════════════════════════════════════════════════════════════ */
export function GuaranteeBar() {
  return (
    <section className="bg-[var(--brand-teal)] px-6 py-5 overflow-hidden">
      <div className="max-w-5xl mx-auto flex flex-col sm:flex-row items-center justify-center gap-4 text-center sm:text-left">
        <div className="flex items-center gap-3 shrink-0">
          <ShieldCheck className="w-7 h-7 text-white/80 shrink-0" />
          <p className="text-base font-black text-white leading-tight">100% Money-back Guarantee</p>
        </div>
        <div className="hidden sm:block h-6 w-px bg-white/20 shrink-0 mx-1" />
        <p className="text-white/70 text-sm leading-relaxed">
          Not satisfied after revisions? Full refund. Always. No questions asked.
        </p>
        <Link href="/how-it-works"
          className="shrink-0 inline-flex items-center gap-1.5 bg-white/10 hover:bg-white/20 text-white/90 text-xs font-semibold px-4 py-2 rounded-xl transition-colors border border-white/15">
          How it works <ArrowRight className="w-3.5 h-3.5" />
        </Link>
      </div>
    </section>
  );
}

/* ════════════════════════════════════════════════════════════════════════════
   ESCROW FLOW — 4-step visual, builds payment trust early
════════════════════════════════════════════════════════════════════════════ */
const ESCROW_STEPS = [
  {
    n: "01", icon: Lock, color: "var(--brand-client)",
    title: "You pay — into escrow",
    desc: "Your money goes into a secure escrow account — never directly to the editor. The editor can't touch a rupee until you approve.",
  },
  {
    n: "02", icon: MessageSquare, color: "var(--brand-editor)",
    title: "Editor works to your brief",
    desc: "Share your brief, reference clips, and deadlines. The editor starts immediately. Platform enforces their delivery deadline automatically.",
  },
  {
    n: "03", icon: CheckCircle, color: "var(--brand-teal)",
    title: "You review — revisions included",
    desc: "Review the delivered work at your own pace. Not happy? Request revisions — they're included in every package. No extra charges, no arguments.",
  },
  {
    n: "04", icon: TrendingUp, color: "#F59E0B",
    title: "Approve → editor gets paid",
    desc: "Only when you explicitly approve does the escrow release to the editor. If you're never satisfied, raise a dispute and get a full refund.",
  },
];

export function EscrowFlowSection() {
  return (
    <section className="bg-[#06040f] py-10 px-6 overflow-hidden">
      {/* Subtle grid */}
      <div className="absolute inset-0 opacity-[0.03]" style={{ backgroundImage: "linear-gradient(rgba(255,255,255,0.7) 1px,transparent 1px),linear-gradient(90deg,rgba(255,255,255,0.7) 1px,transparent 1px)", backgroundSize: "40px 40px" }} />
      <div className="max-w-6xl mx-auto relative z-10">
        <Reveal className="text-center mb-8">
          <div className="inline-flex items-center gap-2 bg-[var(--brand-client)]/10 border border-[var(--brand-client)]/20 rounded-full px-4 py-1.5 mb-5">
            <Lock className="w-3 h-3 text-[var(--brand-client)]" />
            <span className="text-[10px] font-black text-[var(--brand-client)] uppercase tracking-[0.2em]">How your money is protected</span>
          </div>
          <h2 className="text-3xl sm:text-5xl font-black text-white tracking-tight leading-tight mb-4">
            Every rupee protected.<br /><span className="text-white/25">Every step of the way.</span>
          </h2>
          <p className="text-white/40 text-base max-w-xl mx-auto">
            EditBridge uses escrow — your payment is held securely until YOU decide the work is good enough to pay for.
          </p>
        </Reveal>

        {/* Steps — horizontal on desktop, vertical on mobile */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 relative">
          {/* Connector line — desktop only */}
          <div className="absolute top-8 left-[12.5%] right-[12.5%] h-px hidden lg:block"
            style={{ background: "linear-gradient(90deg, #0EA5E9, var(--brand-editor), #0F6E56, #F59E0B)" }} />

          {ESCROW_STEPS.map(({ n, icon: Icon, color, title, desc }, i) => (
            <Reveal key={n} delay={i * 0.1}>
              <div className="relative flex flex-col items-start gap-4 bg-white/[0.04] border border-white/[0.08] rounded-2xl p-6 h-full hover:border-white/[0.14] transition-colors">
                {/* Step number + icon */}
                <div className="flex items-center gap-3 w-full">
                  <div className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0 relative z-10 bg-[#06040f]"
                    style={{ border: `2px solid ${color}`, boxShadow: `0 0 16px ${color}40` }}>
                    <Icon className="w-4.5 h-4.5" style={{ color }} />
                  </div>
                  <span className="text-[10px] font-black tracking-[0.2em] text-white/20">{n}</span>
                </div>
                <div>
                  <p className="text-sm font-black text-white leading-snug mb-2" style={{ color }}>{title}</p>
                  <p className="text-xs text-white/40 leading-relaxed">{desc}</p>
                </div>
              </div>
            </Reveal>
          ))}
        </div>

        {/* Guarantee callout */}
        <Reveal delay={0.4}>
          <div className="mt-8 flex flex-col sm:flex-row items-center justify-center gap-4 text-center sm:text-left bg-white/[0.04] border border-white/[0.08] rounded-2xl px-8 py-5">
            <ShieldCheck className="w-7 h-7 text-[var(--brand-teal)] shrink-0" />
            <p className="text-white/60 text-sm leading-relaxed max-w-xl">
              <span className="text-white font-bold">Still unhappy after revisions?</span> Raise a dispute. Our team reviews both sides and issues a full refund if the work genuinely misses the brief. Zero questions asked.
            </p>
            <Link href="/how-it-works"
              className="shrink-0 text-[var(--brand-client)] text-xs font-bold hover:underline whitespace-nowrap">
              Full guarantee details →
            </Link>
          </div>
        </Reveal>
      </div>
    </section>
  );
}

/* ════════════════════════════════════════════════════════════════════════════
   WORK GALLERY — visual proof of delivered creative output
════════════════════════════════════════════════════════════════════════════ */
const GALLERY_ITEMS = [
  { label: "YouTube Thumbnail", niche: "Tech · 1.4M views", aspect: "16/9", w: "col-span-2", bg: "from-[var(--brand-client)] via-[var(--brand-editor)] to-[#06040f]", badge: "YT", plays: "1.4M", badgeBg: "#FF0000" },
  { label: "Reels Cover",       niche: "Lifestyle · 890k",  aspect: "9/16",  w: "row-span-2", bg: "from-[#F59E0B] via-[#EF4444] to-[var(--brand-editor)]", badge: "IG", plays: "890k", badgeBg: "#E1306C" },
  { label: "Brand Film Frame",  niche: "Corporate · Cinema", aspect: "16/9", w: "",           bg: "from-[var(--brand-teal)] via-[var(--brand-client)] to-[#06040f]",  badge: "▶", plays: "2.1M", badgeBg: "#059669" },
  { label: "Podcast Cover",     niche: "Interview · Ep.48",  aspect: "1/1",  w: "",           bg: "from-[var(--brand-editor)] via-[#db2777] to-[#06040f]",  badge: "🎙", plays: "48k", badgeBg: "var(--brand-editor)" },
  { label: "YouTube Short",     niche: "Comedy · 3.2M",     aspect: "9/16",  w: "",           bg: "from-[#F59E0B] via-[var(--brand-client)] to-[var(--brand-teal)]",  badge: "S", plays: "3.2M", badgeBg: "#FF0000" },
  { label: "Wedding Film",      niche: "Cinematic · Reel",   aspect: "16/9", w: "col-span-2", bg: "from-[#d97706] via-[var(--brand-editor)] to-[#06040f]",  badge: "▶", plays: "42k", badgeBg: "#d97706" },
];

export function WorkGallerySection() {
  return (
    <section className="bg-gray-50 py-10 px-6">
      <div className="max-w-6xl mx-auto">
        <Reveal className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 mb-10">
          <div>
            <div className="flex items-center gap-2 mb-3">
              <div className="h-px w-8 bg-[var(--brand-client)]" />
              <span className="text-[10px] font-black text-[var(--brand-client)] uppercase tracking-[0.22em]">Creative output</span>
            </div>
            <h2 className="text-3xl sm:text-4xl font-black text-gray-900 tracking-tight leading-tight">
              This is what gets delivered.<br />
              <span className="text-gray-300">On EditBridge.</span>
            </h2>
          </div>
          <Link href="/browse" className="shrink-0 inline-flex items-center gap-1.5 text-sm font-bold text-[var(--brand-client)] hover:underline">
            Browse editors <ArrowRight className="w-4 h-4" />
          </Link>
        </Reveal>

        {/* Responsive mosaic grid */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 auto-rows-[160px] gap-3">
          {GALLERY_ITEMS.map(({ label, niche, bg, badge, plays, badgeBg, w }, i) => (
            <Reveal key={label} delay={i * 0.07}
              className={cn("relative rounded-2xl overflow-hidden group cursor-pointer", w)}>
              {/* Gradient background simulating video content */}
              <div className={cn("absolute inset-0 bg-gradient-to-br opacity-90", bg)} />
              {/* Noise overlay for depth */}
              <div className="absolute inset-0 opacity-[0.08]"
                style={{ backgroundImage: "url(\"data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noise'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noise)' opacity='1'/%3E%3C/svg%3E\")" }} />
              {/* Play button overlay */}
              <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-200">
                <div className="w-12 h-12 rounded-full bg-white/20 backdrop-blur-sm border border-white/30 flex items-center justify-center">
                  <div className="w-0 h-0 border-t-[7px] border-b-[7px] border-l-[12px] border-transparent border-l-white ml-1" />
                </div>
              </div>
              {/* Platform badge */}
              <div className="absolute top-3 left-3 w-6 h-6 rounded-md flex items-center justify-center text-white text-[9px] font-black shadow-lg"
                style={{ background: badgeBg }}>
                {badge}
              </div>
              {/* Info overlay */}
              <div className="absolute bottom-0 left-0 right-0 p-3 bg-gradient-to-t from-black/70 to-transparent">
                <p className="text-white text-[11px] font-bold leading-tight">{label}</p>
                <p className="text-white/60 text-[9px] mt-0.5">{niche} · {plays} views</p>
              </div>
            </Reveal>
          ))}
        </div>

        <Reveal delay={0.3} className="mt-6 text-center">
          <p className="text-xs text-gray-400">
            Examples of content types delivered on EditBridge · Each editor has a verified portfolio
          </p>
        </Reveal>
      </div>
    </section>
  );
}

/* ════════════════════════════════════════════════════════════════════════════
   BACK-TO-TOP BUTTON — floating, appears after scroll
════════════════════════════════════════════════════════════════════════════ */
export function BackToTopButton() {
  const [visible, setVisible] = useState(false);
  useEffect(() => {
    const onScroll = () => setVisible(window.scrollY > 800);
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);
  return (
    <AnimatePresence>
      {visible && (
        <motion.button
          initial={{ opacity: 0, scale: 0.8, y: 8 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.8, y: 8 }}
          transition={{ duration: 0.2 }}
          onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}
          className="fixed bottom-6 right-6 z-50 w-10 h-10 rounded-full bg-gray-900/80 backdrop-blur-sm border border-white/10 text-white flex items-center justify-center hover:bg-[var(--brand-client)] transition-colors shadow-xl"
          aria-label="Back to top">
          <ChevronUp className="w-5 h-5" />
        </motion.button>
      )}
    </AnimatePresence>
  );
}
