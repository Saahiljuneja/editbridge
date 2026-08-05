"use client";

import { useState, useRef, useEffect } from "react";
import { ChevronDown, Search } from "lucide-react";
import { COUNTRIES } from "./countries";

export interface PhoneValue {
  countryCode: string;
  dialCode: string;
  number: string;
}

interface PhoneInputProps {
  value: PhoneValue;
  onChange: (v: PhoneValue) => void;
  label?: string;
  sublabel?: string;
  required?: boolean;
}

export function PhoneInput({
  value,
  onChange,
  label = "Phone number",
  sublabel,
  required,
}: PhoneInputProps) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [pos, setPos] = useState({ top: 0, left: 0 });
  const triggerRef = useRef<HTMLButtonElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const searchRef = useRef<HTMLInputElement>(null);

  const selected = COUNTRIES.find(c => c.code === value.countryCode) ?? COUNTRIES[0];
  const filtered = search.trim()
    ? COUNTRIES.filter(c =>
        c.name.toLowerCase().includes(search.toLowerCase()) ||
        c.dial.includes(search) ||
        c.code.toLowerCase().includes(search.toLowerCase())
      )
    : COUNTRIES;

  const DROPDOWN_HEIGHT = 308;

  function openPicker() {
    if (triggerRef.current) {
      const rect = triggerRef.current.getBoundingClientRect();
      // Prefer opening upward; only go downward if there genuinely isn't space above.
      const top = rect.top >= DROPDOWN_HEIGHT + 8
        ? rect.top - DROPDOWN_HEIGHT - 6
        : rect.bottom + 6;
      setPos({ top, left: rect.left });
    }
    setOpen(true);
    setTimeout(() => searchRef.current?.focus(), 40);
  }

  useEffect(() => {
    if (!open) return;
    function onDown(e: MouseEvent) {
      if (
        !dropdownRef.current?.contains(e.target as Node) &&
        !triggerRef.current?.contains(e.target as Node)
      ) {
        setOpen(false);
        setSearch("");
      }
    }
    function onScroll() {
      setOpen(false);
      setSearch("");
    }
    document.addEventListener("mousedown", onDown);
    window.addEventListener("scroll", onScroll, { capture: true, passive: true });
    return () => {
      document.removeEventListener("mousedown", onDown);
      window.removeEventListener("scroll", onScroll, { capture: true });
    };
  }, [open]);

  return (
    <>
      <div className="relative rounded-[20px] border border-neutral-200 bg-white transition-all focus-within:ring-2 focus-within:ring-black/5 focus-within:border-black text-left">
        <div className="px-4 pt-2.5">
          <label className="block text-[10px] font-bold text-neutral-400 uppercase tracking-wider select-none">
            {label}
            {sublabel && (
              <span className="text-neutral-300 font-normal normal-case tracking-normal ml-1">
                ({sublabel})
              </span>
            )}
          </label>
        </div>

        <div className="flex items-center px-4 pb-2.5 mt-0.5 gap-3">
          {/* Country code trigger */}
          <button
            type="button"
            ref={triggerRef}
            onClick={openPicker}
            className="flex items-center gap-1.5 shrink-0 focus:outline-none"
            aria-label="Select country dial code"
          >
            <span className="text-[15px] leading-none">{selected.flag}</span>
            <span className="text-[13.5px] font-semibold text-neutral-700 tabular-nums">
              {selected.dial}
            </span>
            <ChevronDown
              className="w-3 h-3 text-neutral-400 transition-transform duration-150"
              style={{ transform: open ? "rotate(180deg)" : "rotate(0deg)" }}
            />
          </button>

          <div className="w-px h-4 bg-neutral-200 shrink-0" />

          <input
            type="tel"
            placeholder="Enter phone number"
            value={value.number}
            onChange={e => onChange({ ...value, number: e.target.value })}
            autoComplete="tel"
            required={required}
            className="flex-1 bg-transparent text-[14px] text-neutral-900 placeholder-neutral-300 outline-none h-6"
          />
        </div>
      </div>

      {/* Dropdown — fixed so it escapes any overflow:hidden/auto ancestor */}
      {open && (
        <div
          ref={dropdownRef}
          style={{
            position: "fixed",
            top: pos.top,
            left: pos.left,
            zIndex: 9999,
            width: "292px",
            boxShadow: "0 8px 32px rgba(0,0,0,0.10), 0 0 0 1px rgba(0,0,0,0.04)",
          }}
          className="bg-white rounded-2xl overflow-hidden"
        >
          {/* Search */}
          <div className="p-2.5 border-b border-neutral-100">
            <div className="flex items-center gap-2 bg-neutral-50 rounded-xl px-3 py-2 border border-neutral-100">
              <Search className="w-3.5 h-3.5 text-neutral-400 shrink-0" />
              <input
                ref={searchRef}
                type="text"
                placeholder="Search country or dial code…"
                value={search}
                onChange={e => setSearch(e.target.value)}
                className="flex-1 bg-transparent text-[12.5px] text-neutral-700 placeholder-neutral-400 outline-none"
              />
            </div>
          </div>

          {/* Country list */}
          <ul className="overflow-y-auto max-h-[216px] py-1">
            {filtered.length === 0 ? (
              <li className="px-4 py-3 text-[12.5px] text-neutral-400 text-center">
                No results
              </li>
            ) : (
              filtered.map(c => (
                <li key={c.code}>
                  <button
                    type="button"
                    onClick={() => {
                      onChange({ ...value, countryCode: c.code, dialCode: c.dial });
                      setOpen(false);
                      setSearch("");
                    }}
                    className="w-full flex items-center gap-3 px-3.5 py-2 hover:bg-neutral-50 transition-colors text-left"
                  >
                    <span className="text-[15px] leading-none w-5 text-center shrink-0">
                      {c.flag}
                    </span>
                    <span className="flex-1 text-[12.5px] font-medium text-neutral-800 truncate">
                      {c.name}
                    </span>
                    <span className="text-[11.5px] text-neutral-400 font-mono tabular-nums shrink-0">
                      {c.dial}
                    </span>
                  </button>
                </li>
              ))
            )}
          </ul>
        </div>
      )}
    </>
  );
}
