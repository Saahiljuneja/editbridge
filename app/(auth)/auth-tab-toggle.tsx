"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

export function AuthTabToggle() {
  const pathname = usePathname();
  const isLogin =
    pathname.startsWith("/login") ||
    pathname.startsWith("/forgot") ||
    pathname.startsWith("/reset") ||
    pathname.startsWith("/verify") ||
    pathname.startsWith("/2fa");

  const base: React.CSSProperties = {
    flex: 1,
    textAlign: "center",
    padding: "9px 0",
    borderRadius: "30px",
    fontSize: "13.5px",
    fontWeight: 700,
    textDecoration: "none",
    transition: "all 0.2s ease-in-out",
  };

  return (
    <div
      style={{
        display: "flex",
        background: "#f3f4f6",
        borderRadius: "32px",
        padding: "4px",
        border: "1px solid #e5e7eb",
        width: "100%",
        boxSizing: "border-box",
      }}
    >
      <Link
        href="/signup"
        style={{
          ...base,
          background: !isLogin ? "#000000" : "transparent",
          color: !isLogin ? "#ffffff" : "#6b7280",
          boxShadow: !isLogin ? "0 4px 12px rgba(0,0,0,0.15)" : "none",
        }}
      >
        Join
      </Link>
      <Link
        href="/login"
        style={{
          ...base,
          background: isLogin ? "#000000" : "transparent",
          color: isLogin ? "#ffffff" : "#6b7280",
          boxShadow: isLogin ? "0 4px 12px rgba(0,0,0,0.15)" : "none",
        }}
      >
        Sign in
      </Link>
    </div>
  );
}

