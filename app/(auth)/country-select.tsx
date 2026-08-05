"use client";

import { useState, useRef, useEffect } from "react";
import { ChevronDown, Search } from "lucide-react";
import { COUNTRIES } from "./countries";

interface CountrySelectProps {
  value: string;
  onChange: (code: string) => void;
  label?: string;
  required?: boolean;
}

export function CountrySelect({ value, onChange, label = "Country", required }: CountrySelectProps) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [pos, setPos] = useState({ top: 0, left: 0, width: 0 });
  const triggerRef = useRef<HTMLButtonElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const searchRef = useRef<HTMLInputElement>(null);

  const selected = COUNTRIES.find(c => c.code === value);
  const filtered = search.trim()
    ? COUNTRIES.filter(c =>
        c.name.toLowerCase().includes(search.toLowerCase()) ||
        c.code.toLowerCase().includes(search.toLowerCase())
      )
    : COUNTRIES;

  const DROPDOWN_HEIGHT = 308;

  function openPicker() {
    if (triggerRef.current) {
      const rect = triggerRef.current.getBoundingClientRect();
      const top = rect.top >= DROPDOWN_HEIGHT + 8
        ? rect.top - DROPDOWN_HEIGHT - 6
        : rect.bottom + 6;
      setPos({ top, left: rect.left, width: rect.width });
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
            {required && <span className="text-red-400 ml-0.5">*</span>}
          </label>
        </div>
        <button
          type="button"
          ref={triggerRef}
          onClick={openPicker}
          className="w-full flex items-center justify-between px-4 pb-2.5 mt-0.5 focus:outline-none"
        >
          {selected ? (
            <span className="flex items-center gap-2 text-[14px] text-neutral-900">
              <span className="text-[15px]">{selected.flag}</span>
              <span>{selected.name}</span>
            </span>
          ) : (
            <span className="text-[14px] text-neutral-300">Select country</span>
          )}
          <ChevronDown
            className="w-4 h-4 text-neutral-400 shrink-0 transition-transform duration-150"
            style={{ transform: open ? "rotate(180deg)" : "rotate(0deg)" }}
          />
        </button>
      </div>

      {open && (
        <div
          ref={dropdownRef}
          style={{
            position: "fixed",
            top: pos.top,
            left: pos.left,
            zIndex: 9999,
            width: `${pos.width}px`,
            boxShadow: "0 8px 32px rgba(0,0,0,0.10), 0 0 0 1px rgba(0,0,0,0.04)",
          }}
          className="bg-white rounded-2xl overflow-hidden"
        >
          <div className="p-2.5 border-b border-neutral-100">
            <div className="flex items-center gap-2 bg-neutral-50 rounded-xl px-3 py-2 border border-neutral-100">
              <Search className="w-3.5 h-3.5 text-neutral-400 shrink-0" />
              <input
                ref={searchRef}
                type="text"
                placeholder="Search country…"
                value={search}
                onChange={e => setSearch(e.target.value)}
                className="flex-1 bg-transparent text-[12.5px] text-neutral-700 placeholder-neutral-400 outline-none"
              />
            </div>
          </div>

          <ul className="overflow-y-auto max-h-[216px] py-1">
            {filtered.length === 0 ? (
              <li className="px-4 py-3 text-[12.5px] text-neutral-400 text-center">No results</li>
            ) : (
              filtered.map(c => (
                <li key={c.code}>
                  <button
                    type="button"
                    onClick={() => {
                      onChange(c.code);
                      setOpen(false);
                      setSearch("");
                    }}
                    className="w-full flex items-center gap-3 px-3.5 py-2 hover:bg-neutral-50 transition-colors text-left"
                  >
                    <span className="text-[15px] w-5 text-center shrink-0">{c.flag}</span>
                    <span className="flex-1 text-[12.5px] font-medium text-neutral-800 truncate">{c.name}</span>
                    {value === c.code && (
                      <span className="text-[11px] font-bold text-black shrink-0">✓</span>
                    )}
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
