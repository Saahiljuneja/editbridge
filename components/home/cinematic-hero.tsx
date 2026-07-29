"use client";

import React, { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { ShieldCheck, Lock, Star, ArrowRight, Search } from "lucide-react";

const STYLES = `
  .ch-film-grain {
    position: absolute; inset: 0;
    pointer-events: none; z-index: 50; opacity: 0.025; mix-blend-mode: multiply;
    background: url('data:image/svg+xml;utf8,<svg viewBox="0 0 200 200" xmlns="http://www.w3.org/2000/svg"><filter id="n"><feTurbulence type="fractalNoise" baseFrequency="0.85" numOctaves="3" stitchTiles="stitch"/></filter><rect width="100%" height="100%" filter="url(%23n)"/></svg>');
  }
  .ch-grid {
    background-size: 52px 52px;
    background-image:
      linear-gradient(to right, rgba(0,0,0,0.05) 1px, transparent 1px),
      linear-gradient(to bottom, rgba(0,0,0,0.05) 1px, transparent 1px);
    mask-image: radial-gradient(ellipse at center, black 0%, transparent 70%);
    -webkit-mask-image: radial-gradient(ellipse at center, black 0%, transparent 70%);
  }
  .ch-brand-text {
    background: linear-gradient(135deg, var(--brand-client) 0%, var(--brand-editor) 100%);
    -webkit-background-clip: text; -webkit-text-fill-color: transparent;
    background-clip: text; transform: translateZ(0);
  }
  .ch-card-silver {
    background: linear-gradient(180deg, #FFFFFF 0%, #94A3B8 100%);
    -webkit-background-clip: text; -webkit-text-fill-color: transparent;
    background-clip: text; transform: translateZ(0);
    filter: drop-shadow(0 12px 24px rgba(0,0,0,0.8)) drop-shadow(0 4px 8px rgba(0,0,0,0.6));
  }
  .ch-cta-silver {
    background: linear-gradient(180deg, #FFFFFF 0%, rgba(255,255,255,0.5) 100%);
    -webkit-background-clip: text; -webkit-text-fill-color: transparent;
    background-clip: text; transform: translateZ(0);
  }
  .ch-main-card {
    background: linear-gradient(145deg, #0D1B3E 0%, #060B18 100%);
    box-shadow: 0 40px 100px -20px rgba(0,0,0,0.5), 0 20px 40px -20px rgba(0,0,0,0.3),
      inset 0 1px 2px rgba(255,255,255,0.15), inset 0 -2px 4px rgba(0,0,0,0.8);
    border: 1px solid rgba(255,255,255,0.06);
  }
  .ch-sheen {
    position: absolute; inset: 0; border-radius: inherit; pointer-events: none; z-index: 50;
    background: radial-gradient(600px circle at var(--mouse-x,50%) var(--mouse-y,50%), rgba(14,165,233,0.07) 0%, transparent 40%);
    mix-blend-mode: screen;
  }
  .ch-glass {
    background: linear-gradient(135deg, rgba(255,255,255,0.1) 0%, rgba(255,255,255,0.02) 100%);
    backdrop-filter: blur(20px); -webkit-backdrop-filter: blur(20px);
    box-shadow: 0 0 0 1px rgba(255,255,255,0.12), 0 20px 40px -10px rgba(0,0,0,0.5),
      inset 0 1px 1px rgba(255,255,255,0.18);
  }
  .ch-btn-primary {
    background: linear-gradient(180deg, var(--brand-client) 0%, #0284C7 100%);
    box-shadow: 0 0 0 1px rgba(14,165,233,0.3), 0 12px 24px -4px rgba(14,165,233,0.45),
      inset 0 1px 1px rgba(255,255,255,0.3);
    transition: all 0.3s cubic-bezier(0.25,1,0.5,1); color: white;
  }
  .ch-btn-primary:hover { transform: translateY(-2px); box-shadow: 0 0 0 1px rgba(14,165,233,0.4), 0 20px 32px -6px rgba(14,165,233,0.55), inset 0 1px 1px rgba(255,255,255,0.3); }
  .ch-btn-secondary {
    background: linear-gradient(180deg, rgba(255,255,255,0.12) 0%, rgba(255,255,255,0.05) 100%);
    box-shadow: 0 0 0 1px rgba(255,255,255,0.15), inset 0 1px 1px rgba(255,255,255,0.15);
    backdrop-filter: blur(10px); transition: all 0.3s cubic-bezier(0.25,1,0.5,1); color: white;
  }
  .ch-btn-secondary:hover { transform: translateY(-2px); background: linear-gradient(180deg, rgba(255,255,255,0.18) 0%, rgba(255,255,255,0.1) 100%); }
  .ch-editor-card {
    background: linear-gradient(180deg, rgba(255,255,255,0.05) 0%, rgba(255,255,255,0.02) 100%);
    border: 1px solid rgba(255,255,255,0.07);
    transition: border-color 0.2s ease;
  }
  .ch-editor-card:hover { border-color: rgba(14,165,233,0.3); }
`;

const MOCK_EDITORS = [
  { initials: "AM", name: "Arjun M.", role: "YouTube Long-form", rating: 4.9, price: "₹3,500", col: "var(--brand-editor)", orders: 42 },
  { initials: "PS", name: "Priya S.", role: "Thumbnails & Design", rating: 5.0, price: "₹1,200", col: "#059669", orders: 28 },
  { initials: "RK", name: "Rahul K.", role: "Reels & Short-form", rating: 4.8, price: "₹2,000", col: "#ea580c", orders: 35 },
];

interface Props {
  editorCount?: number;
  completedOrders?: number;
  availableCount?: number;
}

export function CinematicHero({ editorCount = 100, completedOrders = 0, availableCount = 0 }: Props) {
  const overlayRef = useRef<HTMLDivElement>(null);
  const mainCardRef = useRef<HTMLDivElement>(null);
  const rafRef = useRef<number>(0);
  const [gone, setGone] = useState(false);

  // Mouse sheen
  useEffect(() => {
    const onMove = (e: MouseEvent) => {
      cancelAnimationFrame(rafRef.current);
      rafRef.current = requestAnimationFrame(() => {
        if (!mainCardRef.current) return;
        const r = mainCardRef.current.getBoundingClientRect();
        mainCardRef.current.style.setProperty("--mouse-x", `${e.clientX - r.left}px`);
        mainCardRef.current.style.setProperty("--mouse-y", `${e.clientY - r.top}px`);
      });
    };
    window.addEventListener("mousemove", onMove);
    return () => { window.removeEventListener("mousemove", onMove); cancelAnimationFrame(rafRef.current); };
  }, []);

  // Auto-play animation
  useEffect(() => {
    if (gone) return;
    let ctx: { revert: () => void } | null = null;
    let mounted = true;

    Promise.all([import("gsap")]).then(([{ gsap }]) => {
      if (!mounted || !overlayRef.current) return;

      ctx = gsap.context(() => {
        // Initial states
        gsap.set(".ch-tag1", { autoAlpha: 0, y: 60, scale: 0.85, filter: "blur(20px)", rotationX: -20 });
        gsap.set(".ch-tag2", { autoAlpha: 0, clipPath: "inset(0 100% 0 0)" });
        gsap.set(".ch-tag3", { autoAlpha: 0, y: 20 });
        gsap.set(".ch-card-el", { y: window.innerHeight + 200, autoAlpha: 1 });
        gsap.set([".ch-left-col", ".ch-right-col", ".ch-mockup", ".ch-mock-card", ".ch-badge", ".ch-stat"], { autoAlpha: 0 });
        gsap.set(".ch-cta", { autoAlpha: 0, scale: 0.85, filter: "blur(30px)" });

        const tl = gsap.timeline({ delay: 0.3 });

        // Phase 1: Taglines appear
        tl.to(".ch-tag1", { duration: 1.2, autoAlpha: 1, y: 0, scale: 1, filter: "blur(0px)", rotationX: 0, ease: "expo.out" })
          .to(".ch-tag2", { duration: 0.9, autoAlpha: 1, clipPath: "inset(0 0% 0 0)", ease: "power4.inOut" }, "-=0.7")
          .to(".ch-tag3", { duration: 0.7, autoAlpha: 1, y: 0, ease: "power3.out" }, "-=0.3")
          .to({}, { duration: 0.8 })

          // Phase 2: Card rises
          .to([".ch-tag-wrapper", ".ch-grid"], { scale: 1.08, filter: "blur(18px)", opacity: 0, duration: 1.5, ease: "power2.inOut" })
          .to(".ch-card-el", { y: 0, duration: 1.5, ease: "power3.inOut" }, "-=1.5")

          // Phase 3: Card expands to full screen
          .to(".ch-card-el", { width: "100%", height: "100%", borderRadius: "0px", duration: 1.2, ease: "power3.inOut" })

          // Phase 4: Content animates in
          .fromTo(".ch-left-col",  { x: -60, autoAlpha: 0 }, { x: 0, autoAlpha: 1, duration: 1.2, ease: "power4.out" }, "-=0.4")
          .fromTo(".ch-right-col", { x:  60, autoAlpha: 0 }, { x: 0, autoAlpha: 1, duration: 1.2, ease: "power4.out" }, "<")
          .fromTo(".ch-mockup",    { y: 50, autoAlpha: 0, scale: 0.92 }, { y: 0, autoAlpha: 1, scale: 1, duration: 1.4, ease: "expo.out" }, "-=0.8")
          .fromTo(".ch-mock-card", { y: 28, autoAlpha: 0 }, { y: 0, autoAlpha: 1, duration: 0.8, stagger: 0.12, ease: "back.out(1.2)" }, "-=1")
          .fromTo(".ch-badge",     { y: 36, autoAlpha: 0, scale: 0.8 }, { y: 0, autoAlpha: 1, scale: 1, duration: 0.8, stagger: 0.15, ease: "back.out(1.5)" }, "-=0.7")
          .fromTo(".ch-stat",      { y: 18, autoAlpha: 0 }, { y: 0, autoAlpha: 1, duration: 0.6, stagger: 0.09, ease: "power3.out" }, "-=0.5")

          // Phase 5: Hold
          .to({}, { duration: 2.2 })

          // Phase 6: Transition to CTA
          .to([".ch-mockup", ".ch-badge", ".ch-left-col", ".ch-right-col"], { scale: 0.92, y: -30, autoAlpha: 0, duration: 0.9, ease: "power2.in" })
          .set(".ch-tag-wrapper", { autoAlpha: 0 })
          .to(".ch-cta", { autoAlpha: 1, scale: 1, filter: "blur(0px)", duration: 1.2, ease: "expo.out" }, "-=0.3")

          // Phase 7: Hold CTA
          .to({}, { duration: 2.0 })

          // Phase 8: Card shrinks & exits
          .to(".ch-card-el", { width: "88vw", height: "88vh", borderRadius: "36px", duration: 1.4, ease: "expo.inOut" })
          .to(".ch-card-el", { y: -(window.innerHeight + 300), duration: 1.2, ease: "power3.in" })

          // Phase 9: Overlay fades out, then removes itself
          .to(overlayRef.current, { autoAlpha: 0, duration: 0.5, ease: "power2.in",
            onComplete: () => { if (mounted) setGone(true); }
          });
      }, overlayRef);
    });

    return () => { mounted = false; ctx?.revert(); };
  }, [gone]);

  if (gone) return null;

  const stats = [
    { label: "Verified editors",  val: `${editorCount}+` },
    { label: "Orders completed",  val: completedOrders > 0 ? `${completedOrders.toLocaleString()}+` : "Growing daily" },
    { label: "Available now",     val: availableCount > 0 ? `${availableCount} online` : "Always open" },
    { label: "Average rating",    val: "4.9 ★" },
  ];

  return (
    <div
      ref={overlayRef}
      className="fixed inset-0 z-[9999] flex items-center justify-center bg-[#F8FAFC] overflow-hidden"
      style={{ perspective: "1500px" }}
    >
      <style dangerouslySetInnerHTML={{ __html: STYLES }} />
      <div className="ch-film-grain" aria-hidden />
      <div className="ch-grid absolute inset-0 z-0 pointer-events-none" aria-hidden />

      {/* Background taglines */}
      <div className="ch-tag-wrapper absolute z-10 flex flex-col items-center justify-center text-center w-full px-4 pointer-events-none">
        <p className="ch-tag1 text-[11px] font-black text-[var(--brand-client)] uppercase tracking-[0.4em] mb-7">EditBridge</p>
        <h1 className="ch-tag1 text-5xl md:text-7xl lg:text-8xl font-black tracking-tight mb-3 text-gray-900">
          Find your perfect
        </h1>
        <h1 className="ch-tag2 ch-brand-text text-5xl md:text-7xl lg:text-8xl font-black tracking-tight">
          video editor.
        </h1>
        <p className="ch-tag3 text-gray-400 text-base mt-6 font-medium">
          KYC-verified · Escrow-protected · India&apos;s #1 marketplace
        </p>
      </div>

      {/* Dark card */}
      <div className="absolute inset-0 z-20 flex items-center justify-center pointer-events-none" style={{ perspective: "1500px" }}>
        <div
          ref={mainCardRef}
          className="ch-card-el ch-main-card relative overflow-hidden flex items-center justify-center pointer-events-auto w-[90vw] md:w-[86vw] h-[88vh] rounded-[32px] md:rounded-[40px]"
        >
          <div className="ch-sheen" aria-hidden />

          {/* CTA — inside card, above content, appears in phase 6 */}
          <div className="ch-cta absolute inset-0 z-[60] flex flex-col items-center justify-center text-center px-6 pointer-events-auto">
            <p className="text-[11px] font-black text-[var(--brand-client)] uppercase tracking-[0.4em] mb-7">Ready to get started?</p>
            <h2 className="text-4xl md:text-6xl lg:text-7xl font-black mb-5 tracking-tight text-white leading-tight">
              Your next video.<br />
              <span className="ch-cta-silver">Professionally edited.</span>
            </h2>
            <p className="text-gray-400 text-base mb-10 max-w-lg mx-auto leading-relaxed">
              Browse {editorCount}+ KYC-verified editors. Pay only after you approve. Disputes handled by our team.
            </p>
            <div className="flex flex-col sm:flex-row gap-4">
              <Link href="/browse" className="ch-btn-primary inline-flex items-center gap-2 px-8 py-4 rounded-2xl font-bold text-base">
                Browse Editors <ArrowRight className="w-4 h-4" />
              </Link>
              <Link href="/signup/client" className="ch-btn-secondary inline-flex items-center gap-2 px-8 py-4 rounded-2xl font-bold text-base">
                Post a Project <ArrowRight className="w-4 h-4" />
              </Link>
            </div>
          </div>

          <div className="relative w-full h-full max-w-7xl mx-auto px-6 lg:px-12 grid grid-cols-1 lg:grid-cols-[1fr_1.3fr_1fr] items-center gap-8 z-10 py-10">

            {/* LEFT */}
            <div className="ch-left-col hidden lg:flex flex-col justify-center">
              <div className="flex items-center gap-2 mb-7">
                <div className="w-6 h-6 rounded-lg bg-[var(--brand-client)] flex items-center justify-center">
                  <ShieldCheck className="w-3.5 h-3.5 text-white" />
                </div>
                <span className="text-[11px] font-black text-[var(--brand-client)] uppercase tracking-[0.28em]">EditBridge</span>
              </div>
              <h3 className="text-white text-3xl lg:text-[2.4rem] font-black leading-tight mb-3">
                India&apos;s #1<br />Video Editing<br />Marketplace
              </h3>
              <p className="text-gray-400 text-sm leading-relaxed mb-8 max-w-[240px]">
                Verified editors. Escrow payment. Dispute protection. Book in minutes.
              </p>
              <div className="space-y-3">
                {stats.map(({ label, val }) => (
                  <div key={label} className="ch-stat flex items-center justify-between border-b border-white/5 pb-3 last:border-0">
                    <span className="text-[11px] text-gray-500 font-medium">{label}</span>
                    <span className="text-sm font-black text-white">{val}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* CENTER — browser mockup */}
            <div className="ch-mockup relative flex items-center justify-center">
              <div className="w-full rounded-2xl overflow-hidden shadow-[0_40px_80px_rgba(0,0,0,0.8)] border border-white/[0.07]">
                <div className="px-4 py-3 flex items-center gap-3"
                  style={{ background: "linear-gradient(180deg,#1E2A3A 0%,#162032 100%)", borderBottom: "1px solid rgba(255,255,255,0.06)" }}>
                  <div className="flex gap-1.5">
                    <div className="w-2.5 h-2.5 rounded-full bg-[#FF5F57]" />
                    <div className="w-2.5 h-2.5 rounded-full bg-[#FFBD2E]" />
                    <div className="w-2.5 h-2.5 rounded-full bg-[#28CA41]" />
                  </div>
                  <div className="flex-1 bg-[#0D1B3E] rounded-md px-3 py-1.5 flex items-center gap-2">
                    <Lock className="w-2.5 h-2.5 text-emerald-400 shrink-0" />
                    <span className="text-[10px] text-gray-400 font-medium truncate">editbridge.com/browse</span>
                  </div>
                </div>
                <div className="bg-[#080F1E] p-4">
                  <div className="flex gap-2 mb-3">
                    <div className="flex-1 bg-[#0D1B3E] rounded-xl px-3 py-2.5 flex items-center gap-2 border border-white/[0.06]">
                      <Search className="w-3.5 h-3.5 text-gray-500 shrink-0" />
                      <span className="text-xs text-gray-500">YouTube video editor...</span>
                    </div>
                    <div className="bg-[var(--brand-client)] rounded-xl px-4 py-2.5 text-xs font-bold text-white shrink-0">Search</div>
                  </div>
                  <div className="flex gap-2 mb-4">
                    {["All", "YouTube", "Reels", "Thumbnails"].map((f, i) => (
                      <span key={f}
                        className={`text-[10px] font-semibold px-3 py-1 rounded-full shrink-0 ${i === 0 ? "bg-[var(--brand-client)] text-white" : "text-gray-400 border border-white/[0.08]"}`}
                        style={i !== 0 ? { background: "rgba(255,255,255,0.04)" } : {}}>
                        {f}
                      </span>
                    ))}
                  </div>
                  <div className="space-y-2">
                    {MOCK_EDITORS.map((e, i) => (
                      <div key={i} className="ch-mock-card ch-editor-card rounded-xl p-3 flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl flex items-center justify-center text-white font-black text-xs shrink-0"
                          style={{ background: `linear-gradient(135deg, ${e.col}cc, ${e.col}66)` }}>
                          {e.initials}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-0.5">
                            <p className="text-xs font-bold text-white truncate">{e.name}</p>
                            <span className="text-[8px] text-[var(--brand-client)] border border-[var(--brand-client)]/25 rounded-full px-1.5 py-0.5 shrink-0"
                              style={{ background: "rgba(14,165,233,0.1)" }}>KYC</span>
                          </div>
                          <p className="text-[10px] text-gray-500 truncate">{e.role}</p>
                        </div>
                        <div className="text-right shrink-0">
                          <p className="text-xs font-black text-white">{e.price}</p>
                          <p className="text-[9px] text-amber-400 flex items-center gap-0.5 justify-end">
                            <Star className="w-2 h-2 fill-amber-400" />{e.rating} · {e.orders} orders
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
              <div className="ch-badge ch-glass absolute -top-5 -left-5 lg:-left-10 rounded-xl p-3 flex items-center gap-3 z-30">
                <div className="w-8 h-8 rounded-full flex items-center justify-center shrink-0"
                  style={{ background: "rgba(14,165,233,0.18)", border: "1px solid rgba(14,165,233,0.3)" }}>
                  <ShieldCheck className="w-4 h-4 text-[var(--brand-client)]" />
                </div>
                <div>
                  <p className="text-white text-xs font-bold leading-tight">KYC Verified</p>
                  <p className="text-gray-400 text-[9px] leading-tight">Every editor ID-checked</p>
                </div>
              </div>
              <div className="ch-badge ch-glass absolute -bottom-5 -right-5 lg:-right-10 rounded-xl p-3 flex items-center gap-3 z-30">
                <div className="w-8 h-8 rounded-full flex items-center justify-center shrink-0"
                  style={{ background: "rgba(16,185,129,0.18)", border: "1px solid rgba(16,185,129,0.3)" }}>
                  <Lock className="w-4 h-4 text-emerald-400" />
                </div>
                <div>
                  <p className="text-white text-xs font-bold leading-tight">Escrow Protected</p>
                  <p className="text-gray-400 text-[9px] leading-tight">Pay only after you approve</p>
                </div>
              </div>
            </div>

            {/* RIGHT */}
            <div className="ch-right-col hidden lg:flex flex-col justify-center items-end text-right">
              <h2 className="ch-card-silver text-6xl lg:text-7xl xl:text-[5.5rem] font-black uppercase tracking-tighter leading-none mb-8">
                Find<br />Your<br />Editor.
              </h2>
              <div className="space-y-3">
                {["KYC-verified identity", "Escrow payment", "Dispute protection", "Revisions included", "Starting ₹299"].map(text => (
                  <p key={text} className="text-xs text-gray-400 font-medium flex items-center justify-end gap-2">
                    <span className="text-[var(--brand-client)] font-black text-sm">✓</span> {text}
                  </p>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
