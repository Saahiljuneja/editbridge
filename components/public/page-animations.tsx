"use client";

import { useRef } from "react";
import { motion, useInView } from "framer-motion";

export function FadeUp({
  children,
  delay = 0,
  className,
}: {
  children: React.ReactNode;
  delay?: number;
  className?: string;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const inView = useInView(ref, { once: true, margin: "-60px" });
  return (
    <motion.div
      ref={ref}
      initial={{ opacity: 0, y: 32 }}
      animate={inView ? { opacity: 1, y: 0 } : {}}
      transition={{ duration: 0.55, delay, ease: [0.25, 0.1, 0.25, 1] }}
      className={className}
    >
      {children}
    </motion.div>
  );
}

export function PageHero({
  badge,
  title,
  subtitle,
  accentColor = "var(--brand-client)",
}: {
  badge: string;
  title: string;
  subtitle: string;
  accentColor?: string;
}) {
  return (
    <section
      className="relative overflow-hidden py-20 px-4 border-b border-neutral-200/60"
      style={{ background: "#f8fafc" }}
    >
      {/* Blob */}
      <div
        className="pointer-events-none absolute -top-32 -left-32 w-[500px] h-[500px] rounded-full opacity-[0.08] blur-3xl"
        style={{ background: accentColor }}
      />
      <div className="relative z-10 max-w-3xl mx-auto text-center">
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="inline-block px-4 py-1.5 rounded-full text-xs font-semibold uppercase tracking-widest mb-6 border"
          style={{
            color: accentColor,
            borderColor: `${accentColor}25`,
            background: `${accentColor}08`,
          }}
        >
          {badge}
        </motion.div>
        <motion.h1
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.55, delay: 0.08 }}
          className="text-4xl md:text-5xl font-extrabold text-neutral-900 mb-5 leading-tight"
        >
          {title}
        </motion.h1>
        <motion.p
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.55, delay: 0.16 }}
          className="text-lg text-neutral-500 max-w-xl mx-auto"
        >
          {subtitle}
        </motion.p>
      </div>
    </section>
  );
}
