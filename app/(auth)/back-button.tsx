"use client";

import { useRouter } from "next/navigation";
import { ArrowLeft } from "lucide-react";

export function BackButton() {
  const router = useRouter();
  return (
    <button
      onClick={() => router.back()}
      className="hover:bg-neutral-50 transition-colors duration-200"
      style={{
        width: "36px",
        height: "36px",
        borderRadius: "50%",
        border: "1px solid #e5e7eb",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        color: "#1f2937",
        background: "#ffffff",
        cursor: "pointer",
      }}
      aria-label="Go back"
    >
      <ArrowLeft style={{ width: "16px", height: "16px" }} />
    </button>
  );
}
