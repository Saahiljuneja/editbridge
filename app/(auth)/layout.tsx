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

        {/* ── RIGHT: Visual panel ── */}
        <div style={{
          flex: 1,
          position: "relative",
          background: "linear-gradient(145deg, #0a0e1a 0%, #0d1424 50%, #0a1020 100%)",
          flexDirection: "column",
          justifyContent: "space-between",
          padding: "40px",
          overflow: "hidden",
        }} className="hidden xl:flex">

          {/* Subtle grid pattern */}
          <div style={{
            position: "absolute",
            inset: 0,
            backgroundImage: "radial-gradient(circle, rgba(14,165,233,0.06) 1px, transparent 1px)",
            backgroundSize: "28px 28px",
            zIndex: 1,
          }} />

          {/* Glow blobs */}
          <div style={{ position: "absolute", top: "15%", left: "30%", width: "280px", height: "280px", borderRadius: "50%", background: "radial-gradient(circle, rgba(14,165,233,0.10) 0%, transparent 70%)", zIndex: 1, pointerEvents: "none" }} />
          <div style={{ position: "absolute", bottom: "20%", right: "10%", width: "220px", height: "220px", borderRadius: "50%", background: "radial-gradient(circle, rgba(139,92,246,0.08) 0%, transparent 70%)", zIndex: 1, pointerEvents: "none" }} />

          {/* Top-right floating status badge */}
          <div style={{ position: "relative", zIndex: 10, display: "flex", justifyContent: "flex-end" }}>
            <div style={{
              background: "#ffffff",
              borderRadius: "16px",
              padding: "10px 16px",
              display: "inline-flex",
              flexDirection: "column",
              gap: "2px",
              boxShadow: "0 8px 24px rgba(0,0,0,0.25)",
            }}>
              <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                <MessageSquare style={{ width: "12px", height: "12px", color: "#0ea5e9" }} />
                <span style={{ fontSize: "11px", fontWeight: 700, color: "#1f2937", whiteSpace: "nowrap" }}>Live Collaboration Room</span>
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: "5px", paddingLeft: "18px" }}>
                <span style={{ width: "5px", height: "5px", borderRadius: "50%", background: "#22c55e", display: "inline-block" }} />
                <span style={{ fontSize: "9px", color: "#6b7280" }}>2 online · active review</span>
              </div>
            </div>
          </div>

          {/* Center: video order review mockup */}
          <div style={{ position: "relative", zIndex: 10, flex: 1, display: "flex", alignItems: "center", justifyContent: "center", margin: "32px 0" }}>
            <div style={{
              background: "#ffffff",
              borderRadius: "20px",
              padding: "18px",
              boxShadow: "0 24px 64px rgba(0,0,0,0.35)",
              width: "100%",
              maxWidth: "340px",
            }}>
              {/* Card header */}
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "14px" }}>
                <div style={{ display: "flex", alignItems: "center", gap: "7px" }}>
                  <span style={{ width: "7px", height: "7px", borderRadius: "50%", background: "#22c55e", display: "inline-block" }} />
                  <span style={{ fontSize: "11px", fontWeight: 700, color: "#111827" }}>Order #EB-0429 · Final Cut</span>
                </div>
                <span style={{ fontSize: "9px", fontWeight: 600, color: "#9ca3af", background: "#f3f4f6", padding: "2px 7px", borderRadius: "20px" }}>v3</span>
              </div>

              {/* Video preview area */}
              <div style={{
                background: "linear-gradient(135deg, #0f172a 0%, #1e293b 100%)",
                borderRadius: "12px",
                height: "120px",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                marginBottom: "10px",
                position: "relative",
                overflow: "hidden",
              }}>
                {/* Fake waveform bars */}
                <div style={{ display: "flex", alignItems: "center", gap: "2px", opacity: 0.3 }}>
                  {[18,30,14,40,22,35,16,28,38,20,32,12,26,42,18,30,24,36,14,28].map((h, i) => (
                    <div key={i} style={{ width: "3px", height: `${h}px`, borderRadius: "2px", background: "#38bdf8" }} />
                  ))}
                </div>
                {/* Play button */}
                <div style={{
                  position: "absolute",
                  width: "38px",
                  height: "38px",
                  borderRadius: "50%",
                  background: "rgba(255,255,255,0.15)",
                  backdropFilter: "blur(4px)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  border: "1.5px solid rgba(255,255,255,0.2)",
                }}>
                  <div style={{ width: 0, height: 0, borderTop: "6px solid transparent", borderBottom: "6px solid transparent", borderLeft: "10px solid white", marginLeft: "3px" }} />
                </div>
              </div>

              {/* Progress bar */}
              <div style={{ marginBottom: "14px" }}>
                <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "5px" }}>
                  <span style={{ fontSize: "9px", color: "#9ca3af" }}>00:42</span>
                  <span style={{ fontSize: "9px", color: "#9ca3af" }}>01:30</span>
                </div>
                <div style={{ height: "3px", background: "#e5e7eb", borderRadius: "2px" }}>
                  <div style={{ height: "100%", width: "47%", background: "#0ea5e9", borderRadius: "2px" }} />
                </div>
              </div>

              {/* Comment bubble */}
              <div style={{ display: "flex", gap: "9px", marginBottom: "14px" }}>
                <div style={{
                  width: "26px", height: "26px", borderRadius: "50%",
                  background: "linear-gradient(135deg, #0ea5e9, #8b5cf6)",
                  display: "flex", alignItems: "center", justifyContent: "center",
                  fontSize: "10px", fontWeight: 700, color: "white", flexShrink: 0,
                }}>R</div>
                <div style={{ background: "#f3f4f6", borderRadius: "10px 10px 10px 3px", padding: "8px 11px", flex: 1 }}>
                  <span style={{ fontSize: "10px", color: "#374151", lineHeight: 1.4 }}>
                    Looks great! Add a subtle fade at 1:24 and it&apos;s perfect ✓
                  </span>
                </div>
              </div>

              {/* Action buttons */}
              <div style={{ display: "flex", gap: "7px" }}>
                <button style={{ flex: 1, background: "#111827", color: "white", border: "none", borderRadius: "9px", padding: "9px 0", fontSize: "10.5px", fontWeight: 700, cursor: "default" }}>✓ Approve</button>
                <button style={{ flex: 1, background: "#f3f4f6", color: "#4b5563", border: "none", borderRadius: "9px", padding: "9px 0", fontSize: "10.5px", fontWeight: 600, cursor: "default" }}>Request revision</button>
              </div>
            </div>
          </div>

          {/* Bottom: headline + feature chips */}
          <div style={{ position: "relative", zIndex: 10 }}>
            <h2 style={{
              fontSize: "2.1rem",
              fontWeight: 800,
              color: "#ffffff",
              lineHeight: 1.1,
              letterSpacing: "-0.03em",
              marginBottom: "10px",
            }}>
              Review & approve <br />
              in <span style={{
                display: "inline-block",
                background: "#e0f2fe",
                color: "#0369a1",
                borderRadius: "30px",
                padding: "2px 14px",
                fontSize: "1.9rem",
                fontWeight: 800,
                marginLeft: "4px",
              }}>real-time</span>
            </h2>
            <p style={{
              fontSize: "12px",
              color: "rgba(255,255,255,0.6)",
              lineHeight: 1.6,
              marginBottom: "20px",
              maxWidth: "400px",
            }}>
              Share your brief, give timestamped feedback, and approve deliveries — all inside EditBridge. No WhatsApp threads, no lost files.
            </p>

            <div style={{ display: "flex", flexWrap: "wrap", gap: "8px" }}>
              {[
                { label: "Live Chat",          color: "#38bdf8" },
                { label: "Timeline Comments",  color: "#a78bfa" },
                { label: "Instant Reviews",    color: "#34d399" },
                { label: "Escrow Safe",        color: "#fb7185" },
              ].map(({ label, color }) => (
                <div key={label} style={{ display: "flex", alignItems: "center", gap: "6px", background: "rgba(255,255,255,0.06)", borderRadius: "20px", padding: "6px 12px", border: "1px solid rgba(255,255,255,0.08)" }}>
                  <span style={{ width: "6px", height: "6px", borderRadius: "50%", background: color, display: "inline-block" }} />
                  <span style={{ fontSize: "10.5px", fontWeight: 600, color: "#ffffff" }}>{label}</span>
                </div>
              ))}
            </div>
          </div>

        </div>
      </div>
    </div>
  );
}
