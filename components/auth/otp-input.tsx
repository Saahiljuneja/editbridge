"use client";

import { forwardRef, useEffect, useImperativeHandle, useRef, useState } from "react";
import { motion, useAnimation } from "framer-motion";
import { cn } from "@/lib/utils";

export interface OtpInputHandle {
  reset: () => void;
  shake: () => void;
}

interface OtpInputProps {
  length?: number;
  onComplete: (code: string) => void;
  onChange?: (code: string) => void;
  disabled?: boolean;
  error?: boolean;
}

export const OtpInput = forwardRef<OtpInputHandle, OtpInputProps>(function OtpInput(
  { length = 6, onComplete, onChange, disabled, error },
  ref
) {
  const [digits, setDigits] = useState<string[]>(Array(length).fill(""));
  const inputRefs = useRef<(HTMLInputElement | null)[]>([]);
  const controls = useAnimation();

  useEffect(() => {
    controls.start({ opacity: 1, y: 0, transition: { duration: 0.4, ease: "easeOut" } });
  }, [controls]);

  useImperativeHandle(ref, () => ({
    reset() {
      setDigits(Array(length).fill(""));
      onChange?.("");
      inputRefs.current[0]?.focus();
    },
    shake() {
      controls.start({
        x: [0, -8, 8, -6, 6, -3, 3, 0],
        transition: { duration: 0.4 },
      });
    },
  }));

  function updateDigits(next: string[]) {
    setDigits(next);
    onChange?.(next.join(""));
    if (next.every((d) => d !== "")) onComplete(next.join(""));
  }

  function handleChange(idx: number, val: string) {
    // Support pasting the full code into any box
    if (val.length > 1) {
      const pasted = val.replace(/\D/g, "").slice(0, length);
      const next = [...digits];
      pasted.split("").forEach((ch, i) => {
        if (idx + i < length) next[idx + i] = ch;
      });
      updateDigits(next);
      const focusIdx = Math.min(idx + pasted.length, length - 1);
      inputRefs.current[focusIdx]?.focus();
      return;
    }
    const ch = val.replace(/\D/g, "");
    const next = [...digits];
    next[idx] = ch;
    updateDigits(next);
    if (ch && idx < length - 1) inputRefs.current[idx + 1]?.focus();
  }

  function handleKeyDown(idx: number, e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === "Backspace" && !digits[idx] && idx > 0) {
      inputRefs.current[idx - 1]?.focus();
    }
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={controls}
      className="flex justify-center gap-2 sm:gap-2.5"
    >
      {digits.map((d, i) => (
        <motion.input
          key={i}
          ref={(el) => { inputRefs.current[i] = el; }}
          type="text"
          inputMode="numeric"
          autoComplete={i === 0 ? "one-time-code" : "off"}
          maxLength={length}
          value={d}
          disabled={disabled}
          onChange={(e) => handleChange(i, e.target.value)}
          onKeyDown={(e) => handleKeyDown(i, e)}
          onFocus={(e) => e.target.select()}
          animate={{ scale: d ? 1.04 : 1 }}
          whileFocus={{ scale: 1.08 }}
          whileTap={{ scale: 0.95 }}
          transition={{ type: "spring", stiffness: 480, damping: 22 }}
          className={cn(
            "w-10 h-12 sm:w-12 sm:h-14 text-center text-lg sm:text-xl font-bold rounded-xl border-2 outline-none transition-colors duration-200",
            error
              ? "border-red-400 bg-red-50 text-red-600"
              : d
                ? "border-[var(--brand-client)] bg-[var(--brand-client)]/5 text-[var(--brand-client)] shadow-sm shadow-[var(--brand-client)]/10"
                : "border-gray-200 bg-white text-gray-900 focus:border-[var(--brand-client)] focus:ring-2 focus:ring-[var(--brand-client)]/15",
            disabled && "opacity-50 cursor-not-allowed"
          )}
        />
      ))}
    </motion.div>
  );
});
