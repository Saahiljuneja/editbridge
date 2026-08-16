"use client";

import { useEffect, useRef } from "react";
import { motion, useMotionValue, useSpring, useScroll, useTransform } from "framer-motion";

// Color stops keyed to scroll position [0 → 1]
const ORB_COLORS = [
  { stop: 0,    color: "rgba(124, 58, 237, 0.18)"  }, // violet
  { stop: 0.2,  color: "rgba(79, 70, 229, 0.18)"   }, // indigo
  { stop: 0.4,  color: "rgba(6, 182, 212, 0.18)"   }, // cyan
  { stop: 0.6,  color: "rgba(16, 185, 129, 0.18)"  }, // emerald
  { stop: 0.75, color: "rgba(245, 158, 11, 0.18)"  }, // amber
  { stop: 0.9,  color: "rgba(244, 63, 94, 0.18)"   }, // rose
  { stop: 1,    color: "rgba(124, 58, 237, 0.18)"  }, // back to violet
];

function lerp(a: number, b: number, t: number) {
  return a + (b - a) * t;
}

function interpolateColor(scroll: number): string {
  // Find surrounding stops
  let lo = ORB_COLORS[0];
  let hi = ORB_COLORS[ORB_COLORS.length - 1];
  for (let i = 0; i < ORB_COLORS.length - 1; i++) {
    if (scroll >= ORB_COLORS[i].stop && scroll <= ORB_COLORS[i + 1].stop) {
      lo = ORB_COLORS[i];
      hi = ORB_COLORS[i + 1];
      break;
    }
  }
  // Parse rgba components
  const parse = (c: string) => {
    const m = c.match(/[\d.]+/g)!.map(Number);
    return { r: m[0], g: m[1], b: m[2], a: m[3] };
  };
  const t = lo.stop === hi.stop ? 0 : (scroll - lo.stop) / (hi.stop - lo.stop);
  const lc = parse(lo.color);
  const hc = parse(hi.color);
  return `rgba(${Math.round(lerp(lc.r, hc.r, t))}, ${Math.round(lerp(lc.g, hc.g, t))}, ${Math.round(lerp(lc.b, hc.b, t))}, ${lerp(lc.a, hc.a, t).toFixed(2)})`;
}

export function CursorOrb() {
  const orbRef = useRef<HTMLDivElement>(null);
  const mx = useMotionValue(-999);
  const my = useMotionValue(-999);
  const sx = useSpring(mx, { stiffness: 80, damping: 22, mass: 0.6 });
  const sy = useSpring(my, { stiffness: 80, damping: 22, mass: 0.6 });
  const { scrollYProgress } = useScroll();

  useEffect(() => {
    // Only enable on pointer devices
    const mq = window.matchMedia("(pointer: coarse)");
    if (mq.matches) return;

    const onMove = (e: MouseEvent) => {
      mx.set(e.clientX);
      my.set(e.clientY);
    };
    const onLeave = () => {
      mx.set(-999);
      my.set(-999);
    };
    window.addEventListener("mousemove", onMove, { passive: true });
    document.documentElement.addEventListener("mouseleave", onLeave);
    return () => {
      window.removeEventListener("mousemove", onMove);
      document.documentElement.removeEventListener("mouseleave", onLeave);
    };
  }, [mx, my]);

  // Update orb color on scroll
  useEffect(() => {
    const unsubscribe = scrollYProgress.on("change", (v) => {
      if (orbRef.current) {
        orbRef.current.style.background = interpolateColor(v);
      }
    });
    return unsubscribe;
  }, [scrollYProgress]);

  return (
    <motion.div
      ref={orbRef}
      className="fixed pointer-events-none z-[9998] rounded-full"
      style={{
        width: 420,
        height: 420,
        x: sx,
        y: sy,
        translateX: "-50%",
        translateY: "-50%",
        background: "rgba(124, 58, 237, 0.18)",
        filter: "blur(80px)",
        willChange: "transform",
      }}
      aria-hidden="true"
    />
  );
}
