"use client";

import { useState } from "react";
import { Eye, EyeOff, Check } from "lucide-react";
import { cn } from "@/lib/utils";

const RULES = [
  { label: "Must include at least 1 lowercase letter", test: (p: string) => /[a-z]/.test(p) },
  { label: "Must include at least 1 uppercase letter", test: (p: string) => /[A-Z]/.test(p) },
  { label: "Must include at least 1 number",           test: (p: string) => /[0-9]/.test(p) },
  { label: "Must include at least 1 special character",test: (p: string) => /[^a-zA-Z0-9]/.test(p) },
  { label: "Must be at least 8 characters long",       test: (p: string) => p.length >= 8 },
];

interface PasswordInputProps {
  id: string;
  name: string;
  value: string;
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  placeholder?: string;
  autoComplete?: string;
  showRules?: boolean;
  error?: string;
}

export function PasswordInput({
  id, name, value, onChange, placeholder = "••••••••",
  autoComplete, showRules = false, error,
}: PasswordInputProps) {
  const [show, setShow] = useState(false);

  return (
    <div className="space-y-2">
      <div className="relative">
        <input
          id={id}
          name={name}
          type={show ? "text" : "password"}
          value={value}
          onChange={onChange}
          placeholder={placeholder}
          autoComplete={autoComplete}
          className={cn(
            "flex h-10 w-full rounded-md border bg-background px-3 py-2 pr-10 text-sm ring-offset-background",
            "placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
            "disabled:cursor-not-allowed disabled:opacity-50 transition-colors",
            error ? "border-red-400 focus-visible:ring-red-400" : "border-input"
          )}
        />
        <button
          type="button"
          onClick={() => setShow((s) => !s)}
          className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors"
          tabIndex={-1}
        >
          {show ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
        </button>
      </div>

      {error && <p className="text-xs text-red-500">{error}</p>}

      {showRules && value.length > 0 && (
        <ul className="space-y-1.5 pt-1">
          {RULES.map(({ label, test }) => {
            const passed = test(value);
            return (
              <li key={label} className="flex items-center gap-2">
                <Check className={cn("w-3.5 h-3.5 shrink-0", passed ? "text-[#0EA5E9]" : "text-gray-300")} />
                <span className={cn("text-xs", passed ? "text-[#0EA5E9]" : "text-gray-400")}>
                  {label}
                </span>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}

export function allRulesPassed(password: string) {
  return RULES.every(({ test }) => test(password));
}
