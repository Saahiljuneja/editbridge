"use client";

import { motion, useMotionValue, useTransform } from "motion/react";
import { useAdminTheme } from "./admin-theme-provider";
import { cn } from "@/lib/utils";

function SolarSwitch({ isDark }: { isDark: boolean }) {
  const duration = 0.6;
  const moonVariants = { checked: { scale: 1 }, unchecked: { scale: 0 } };
  const sunVariants  = { checked: { scale: 0 }, unchecked: { scale: 1 } };
  const scaleMoon    = useMotionValue(isDark ? 1 : 0);
  const scaleSun     = useMotionValue(isDark ? 0 : 1);
  const pathMoon     = useTransform(scaleMoon, [0.6, 1], [0, 1]);
  const pathSun      = useTransform(scaleSun,  [0.6, 1], [0, 1]);

  const sunPath = (d: string) => (
    <motion.path
      d={d} stroke="currentColor" strokeWidth="2"
      strokeLinecap="round" strokeLinejoin="round"
      variants={sunVariants} transition={{ duration }}
      style={{ pathLength: pathSun, scale: scaleSun }}
    />
  );

  return (
    <motion.div animate={isDark ? "checked" : "unchecked"}>
      <motion.svg width="18" height="18" viewBox="0 0 25 25" fill="none">
        {sunPath("M12.4 17.76a5 5 0 1 0 0-10 5 5 0 0 0 0 10Z")}
        {sunPath("M12.4 1.76v2")}
        {sunPath("M12.4 21.76v2")}
        {sunPath("M4.63 4.98 6.05 6.4")}
        {sunPath("M18.77 19.12l1.42 1.42")}
        {sunPath("M1.4 12.76h2")}
        {sunPath("M21.4 12.76h2")}
        {sunPath("M4.63 20.54 6.05 19.12")}
        {sunPath("M18.77 6.4l1.42-1.42")}
        <motion.path
          d="M21.19 13.2a9 9 0 1 1-8.79-9.79 7 7 0 0 0 8.79 9.79Z"
          stroke="currentColor" strokeWidth="2"
          strokeLinecap="round" strokeLinejoin="round"
          variants={moonVariants} transition={{ duration }}
          style={{ pathLength: pathMoon, scale: scaleMoon }}
        />
      </motion.svg>
    </motion.div>
  );
}

export function AdminThemeToggle({ className }: { className?: string }) {
  const { theme, toggle } = useAdminTheme();
  const isDark = theme === "dark";

  return (
    <button
      onClick={toggle}
      aria-label={isDark ? "Switch to light mode" : "Switch to dark mode"}
      className={cn(
        "flex items-center justify-center w-8 h-8 rounded-lg transition-colors",
        "text-gray-400 hover:text-gray-200 hover:bg-white/10",
        className
      )}
    >
      <SolarSwitch isDark={isDark} />
    </button>
  );
}
