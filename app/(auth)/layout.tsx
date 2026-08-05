import Link from "next/link";
import { ShieldCheck, MapPin, MessageSquare, Users } from "lucide-react";
import { AuthTabToggle } from "./auth-tab-toggle";
import { BackButton } from "./back-button";
import { TopoBackground } from "@/components/common/topo-background";

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div style={{
      minHeight: "100vh",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      background: "#eae8e3",
      padding: "48px 24px",
      position: "relative",
      overflow: "hidden",
    }}>
      <TopoBackground background="#f5f4ef" />

      {/* Centered Main Card */}
      <div style={{
        position: "relative",
        zIndex: 10,
        display: "flex",
        width: "100%",
        minHeight: "720px",
        borderRadius: "32px",
        overflow: "hidden",
        background: "#ffffff",
        boxShadow: "0 30px 90px rgba(0,0,0,0.06), 0 0 0 1px rgba(0,0,0,0.03)",
      }} className="flex-col lg:flex-row max-w-[520px] lg:max-w-[1120px] auth-card-container">

        {/* ── LEFT: Form panel ── */}
        <div style={{
          position: "relative",
          display: "flex",
          flexDirection: "column",
          width: "100%",
          maxWidth: "520px",
          flexShrink: 0,
          background: "#ffffff",
          overflowY: "auto",
          padding: "24px 40px",
        }} className="w-full lg:max-w-[520px]">
          {/* Top Bar with Back, Menu, and Canada Selector */}
          <div style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            marginBottom: "20px",
            width: "100%",
          }}>
            <div style={{ display: "flex", gap: "10px" }}>
              <BackButton />
            </div>

          </div>

          {/* children */}
          <div style={{ flex: 1, display: "flex", flexDirection: "column", justifyContent: "center" }}>
            {children}
          </div>

          {/* footer */}
          <div style={{ marginTop: "16px", paddingTop: "12px", borderTop: "1px solid #f3f4f6" }}>
            <p style={{ fontSize: "11px", color: "#9ca3af", lineHeight: 1.6, textAlign: "center" }}>
              By continuing you agree to our{" "}
              <Link href="/terms" className="font-bold text-neutral-500 hover:underline">Terms</Link> &{" "}
              <Link href="/privacy" className="font-bold text-neutral-500 hover:underline">Privacy</Link>
              <br />© 2026 EditBridge
            </p>
          </div>
        </div>

        {/* ── RIGHT: Visual panel (autumn forest road) ── */}
        <div style={{
          flex: 1,
          position: "relative",
          backgroundColor: "#080c14",
          backgroundImage: "url('/auth_right_image.jpg')",
          backgroundSize: "cover",
          backgroundPosition: "center",
          flexDirection: "column",
          justifyContent: "space-between",
          padding: "40px",
          overflow: "hidden",
        }} className="hidden xl:flex">
          {/* Subtle overlay to enhance contrast */}
          <div style={{
            position: "absolute",
            inset: 0,
            background: "linear-gradient(to bottom, rgba(8,12,20,0.1) 0%, rgba(8,12,20,0.3) 50%, rgba(4,6,10,0.85) 100%)",
            zIndex: 1,
          }} />

          {/* Location details top-right - Floating White Box */}
          <div style={{ position: "relative", zIndex: 10, display: "flex", justifyContent: "flex-end" }}>
            <div style={{
              background: "#ffffff",
              borderRadius: "16px",
              padding: "10px 16px",
              display: "inline-flex",
              flexDirection: "column",
              gap: "2px",
              boxShadow: "0 8px 24px rgba(0,0,0,0.15)",
              maxWidth: "280px",
            }}>
              <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                <MessageSquare style={{ width: "12px", height: "12px", color: "#0ea5e9" }} />
                <span style={{ fontSize: "11px", fontWeight: 700, color: "#1f2937", whiteSpace: "nowrap" }}>Live Collaboration Room</span>
              </div>
              <span style={{ fontSize: "9px", color: "#6b7280", paddingLeft: "18px" }}>2 online · active review line</span>
            </div>
          </div>

          {/* Polaroid Collage Box (centered overlay) */}
          <div style={{ position: "relative", zIndex: 10, flex: 1, display: "flex", alignItems: "center", justifyContent: "center", margin: "40px 0" }}>
            <div style={{
              background: "#ffffff",
              borderRadius: "20px",
              padding: "12px",
              boxShadow: "0 20px 48px rgba(0,0,0,0.25)",
              width: "100%",
              maxWidth: "340px",
              transform: "rotate(-2deg)",
            }}>
              {/* Inner Photos Grid */}
              <div style={{ display: "grid", gridTemplateRows: "180px 80px", gap: "8px" }}>
                {/* Top Main Image */}
                <div style={{
                  borderRadius: "12px",
                  overflow: "hidden",
                  backgroundImage: "url('/auth_right_image.jpg')",
                  backgroundSize: "cover",
                  backgroundPosition: "center 30%",
                }} />
                {/* Bottom row: 2 images */}
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "8px" }}>
                  <div style={{
                    borderRadius: "8px",
                    overflow: "hidden",
                    backgroundImage: "url('/auth_right_image.jpg')",
                    backgroundSize: "cover",
                    backgroundPosition: "center 80%",
                  }} />
                  <div style={{
                    borderRadius: "8px",
                    overflow: "hidden",
                    background: "#1f2937",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                  }}>
                    {/* Simulated dashboard view */}
                    <div style={{ width: "100%", height: "100%", opacity: 0.8, backgroundImage: "linear-gradient(135deg, #0f172a, #020617)" }} />
                  </div>
                </div>
              </div>
              <div style={{
                marginTop: "12px",
                display: "flex",
                alignItems: "center",
                gap: "6px",
                fontSize: "10.5px",
                fontWeight: 700,
                color: "#4b5563",
                fontFamily: "monospace",
              }}>
                <span>💬</span>
                <span>Active workspace feedback loop</span>
              </div>
            </div>
          </div>

          {/* Bottom text + Destinations details */}
          <div style={{ position: "relative", zIndex: 10 }}>
            <h2 style={{
              fontSize: "2.1rem",
              fontWeight: 800,
              color: "#ffffff",
              lineHeight: 1.1,
              letterSpacing: "-0.03em",
              marginBottom: "10px",
            }}>
              Network & collaborate <br />
              in <span style={{
                display: "inline-block",
                background: "#e0f2fe",
                color: "#0369a1",
                borderRadius: "30px",
                padding: "2px 14px",
                fontSize: "1.9rem",
                fontWeight: 800,
                boxShadow: "0 4px 14px rgba(224,242,254,0.25)",
                marginLeft: "4px",
              }}>real-time</span>
            </h2>
            <p style={{
              fontSize: "12px",
              color: "rgba(255,255,255,0.7)",
              lineHeight: 1.6,
              marginBottom: "20px",
              maxWidth: "420px",
            }}>
              Connect directly with verified editors, coordinate creative briefs, review video timelines, and communicate feedback in real-time.
            </p>

            {/* Destinations listing */}
            <div style={{ display: "flex", flexWrap: "wrap", gap: "8px" }}>
              <div style={{ display: "flex", alignItems: "center", gap: "6px", background: "rgba(0,0,0,0.4)", borderRadius: "20px", padding: "6px 12px", border: "1px solid rgba(255,255,255,0.1)" }}>
                <span style={{ width: "6px", height: "6px", borderRadius: "50%", background: "#38bdf8" }} />
                <span style={{ fontSize: "10.5px", fontWeight: 600, color: "#ffffff" }}>Live Chat</span>
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: "6px", background: "rgba(0,0,0,0.4)", borderRadius: "20px", padding: "6px 12px", border: "1px solid rgba(255,255,255,0.1)" }}>
                <span style={{ width: "6px", height: "6px", borderRadius: "50%", background: "#a78bfa" }} />
                <span style={{ fontSize: "10.5px", fontWeight: 600, color: "#ffffff" }}>Timeline Comments</span>
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: "6px", background: "rgba(0,0,0,0.4)", borderRadius: "20px", padding: "6px 12px", border: "1px solid rgba(255,255,255,0.1)" }}>
                <span style={{ width: "6px", height: "6px", borderRadius: "50%", background: "#34d399" }} />
                <span style={{ fontSize: "10.5px", fontWeight: 600, color: "#ffffff" }}>Instant Reviews</span>
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: "6px", background: "rgba(0,0,0,0.4)", borderRadius: "20px", padding: "6px 12px", border: "1px solid rgba(255,255,255,0.1)" }}>
                <span style={{ width: "6px", height: "6px", borderRadius: "50%", background: "#fb7185" }} />
                <span style={{ fontSize: "10.5px", fontWeight: 600, color: "#ffffff" }}>Escrow Safe</span>
              </div>
            </div>
          </div>

        </div>
      </div>
    </div>
  );
}
