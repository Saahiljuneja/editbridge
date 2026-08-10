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
          background: "#05070f",
          flexDirection: "column",
          justifyContent: "space-between",
          padding: "40px",
          overflow: "hidden",
        }} className="hidden xl:flex">

          {/* Subtle grid pattern */}
          <div style={{
            position: "absolute",
            inset: 0,
            backgroundImage: "radial-gradient(circle, rgba(14,165,233,0.06) 1.5px, transparent 1.5px)",
            backgroundSize: "32px 32px",
            zIndex: 1,
          }} />

          {/* Glow blobs */}
          <div style={{ position: "absolute", top: "-10%", right: "-10%", width: "400px", height: "400px", borderRadius: "50%", background: "radial-gradient(circle, rgba(124,58,237,0.12) 0%, transparent 70%)", zIndex: 1, pointerEvents: "none", filter: "blur(60px)" }} />
          <div style={{ position: "absolute", bottom: "-10%", left: "-10%", width: "400px", height: "400px", borderRadius: "50%", background: "radial-gradient(circle, rgba(14,165,233,0.12) 0%, transparent 70%)", zIndex: 1, pointerEvents: "none", filter: "blur(60px)" }} />

          {/* Top-right floating status badge */}
          <div style={{ position: "relative", zIndex: 10, display: "flex", justifyContent: "flex-end" }}>
            <div style={{
              background: "rgba(255, 255, 255, 0.03)",
              backdropFilter: "blur(12px)",
              border: "1px solid rgba(255, 255, 255, 0.08)",
              borderRadius: "20px",
              padding: "10px 18px",
              display: "inline-flex",
              alignItems: "center",
              gap: "10px",
              boxShadow: "0 8px 32px rgba(0,0,0,0.3)",
            }}>
              <div style={{ width: "8px", height: "8px", borderRadius: "50%", background: "#22c55e", boxShadow: "0 0 12px #22c55e", position: "relative" }}>
                <span style={{
                  position: "absolute",
                  inset: -2,
                  borderRadius: "50%",
                  border: "1.5px solid #22c55e",
                  opacity: 0.8,
                  animation: "ping 1.5s cubic-bezier(0, 0, 0.2, 1) infinite",
                }} />
              </div>
              <div style={{ display: "flex", flexDirection: "column" }}>
                <span style={{ fontSize: "11px", fontWeight: 700, color: "#ffffff", letterSpacing: "0.02em" }}>Review Session Live</span>
                <span style={{ fontSize: "9px", color: "rgba(255,255,255,0.4)", marginTop: "1px" }}>3 participants connected</span>
              </div>
            </div>
          </div>

          {/* Center: premium video editor review mockup */}
          <div style={{ position: "relative", zIndex: 10, flex: 1, display: "flex", alignItems: "center", justifyContent: "center", margin: "40px 0" }}>
            <div style={{
              background: "linear-gradient(135deg, rgba(20, 26, 46, 0.7) 0%, rgba(10, 12, 24, 0.85) 100%)",
              backdropFilter: "blur(20px)",
              border: "1px solid rgba(255, 255, 255, 0.08)",
              borderRadius: "24px",
              padding: "20px",
              boxShadow: "0 30px 70px rgba(0,0,0,0.5)",
              width: "100%",
              maxWidth: "360px",
            }}>
              {/* macOS window controls */}
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "16px" }}>
                <div style={{ display: "flex", gap: "6px" }}>
                  <span style={{ width: "8px", height: "8px", borderRadius: "50%", background: "#ef4444" }} />
                  <span style={{ width: "8px", height: "8px", borderRadius: "50%", background: "#eab308" }} />
                  <span style={{ width: "8px", height: "8px", borderRadius: "50%", background: "#22c55e" }} />
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                  <span style={{ fontSize: "10px", fontWeight: 700, color: "rgba(255,255,255,0.7)", background: "rgba(255,255,255,0.06)", padding: "3px 10px", borderRadius: "20px", border: "1px solid rgba(255,255,255,0.05)" }}>Order #EB-0429</span>
                  <span style={{ fontSize: "9px", fontWeight: 700, color: "#38bdf8", background: "rgba(56,189,248,0.1)", padding: "2px 8px", borderRadius: "20px" }}>v3 final</span>
                </div>
              </div>

              {/* Video preview area with mock design lines */}
              <div style={{
                background: "linear-gradient(to bottom, #111827, #030712)",
                borderRadius: "14px",
                height: "150px",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                marginBottom: "12px",
                position: "relative",
                overflow: "hidden",
                border: "1px solid rgba(255,255,255,0.04)"
              }}>
                {/* Safe margin guides */}
                <div style={{ position: "absolute", inset: "12px", border: "1px dashed rgba(255,255,255,0.05)", borderRadius: "6px", pointerEvents: "none" }} />
                
                {/* Simulated frame shot (radial backdrop) */}
                <div style={{ position: "absolute", width: "100%", height: "100%", background: "radial-gradient(circle, rgba(99,102,241,0.2) 0%, transparent 70%)", zIndex: 1 }} />
                
                {/* Timecode overlay */}
                <div style={{ position: "absolute", top: "18px", left: "20px", display: "flex", alignItems: "center", gap: "6px", zIndex: 5 }}>
                  <span style={{ width: "5px", height: "5px", borderRadius: "50%", background: "#ef4444", animation: "pulse 1s infinite" }} />
                  <span style={{ fontSize: "10px", color: "rgba(255,255,255,0.5)", fontFamily: "monospace" }}>00:01:24:12</span>
                </div>

                {/* Level meters */}
                <div style={{ position: "absolute", right: "20px", top: "18px", bottom: "18px", width: "4px", display: "flex", flexDirection: "column", gap: "2px", zIndex: 5 }}>
                  {[1,2,3,4,5,6,7,8].map((v) => (
                    <span key={v} style={{ flex: 1, borderRadius: "1px", background: v <= 2 ? "#ef4444" : v <= 4 ? "#eab308" : "#22c55e", opacity: v === 1 ? 0.3 : 0.9 }} />
                  ))}
                </div>

                {/* Play button */}
                <div style={{
                  position: "relative",
                  zIndex: 10,
                  width: "44px",
                  height: "44px",
                  borderRadius: "50%",
                  background: "rgba(255,255,255,0.08)",
                  backdropFilter: "blur(8px)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  border: "1px solid rgba(255,255,255,0.15)",
                  boxShadow: "0 8px 24px rgba(0,0,0,0.3)",
                }}>
                  <div style={{ width: 0, height: 0, borderTop: "7px solid transparent", borderBottom: "7px solid transparent", borderLeft: "11px solid white", marginLeft: "4px" }} />
                </div>

                {/* Bottom title display */}
                <span style={{ position: "absolute", bottom: "18px", left: "20px", fontSize: "10px", color: "rgba(255,255,255,0.4)", zIndex: 5 }}>B-Roll Selection</span>
              </div>

              {/* Advanced Timeline representation with tracks */}
              <div style={{ marginBottom: "16px", background: "rgba(0,0,0,0.2)", padding: "10px", borderRadius: "12px", border: "1px solid rgba(255,255,255,0.03)" }}>
                {/* Timeline ruler */}
                <div style={{ display: "flex", justifyContent: "space-between", fontSize: "8px", color: "rgba(255,255,255,0.3)", fontFamily: "monospace", paddingBottom: "6px", borderBottom: "1px solid rgba(255,255,255,0.04)" }}>
                  <span>00:00</span>
                  <span>00:45</span>
                  <span style={{ color: "#38bdf8" }}>01:24</span>
                  <span>02:00</span>
                </div>

                {/* Tracks list */}
                <div style={{ display: "flex", flexDirection: "column", gap: "5px", marginTop: "6px", position: "relative" }}>
                  {/* Vertical Playhead Cursor line */}
                  <div style={{
                    position: "absolute",
                    left: "67%",
                    top: 0,
                    bottom: 0,
                    width: "1.5px",
                    background: "#f97316",
                    zIndex: 10,
                    boxShadow: "0 0 8px #f97316",
                  }}>
                    {/* Playhead handle */}
                    <div style={{ position: "absolute", top: "-5px", left: "-3.5px", width: "9px", height: "6px", background: "#f97316", transform: "rotate(45deg)" }} />
                  </div>

                  {/* Video Track */}
                  <div style={{ display: "flex", height: "14px", background: "rgba(139, 92, 246, 0.15)", border: "1px solid rgba(139, 92, 246, 0.25)", borderRadius: "4px", overflow: "hidden", alignItems: "center", padding: "0 6px" }}>
                    <span style={{ fontSize: "8px", fontWeight: 700, color: "#c084fc", whiteSpace: "nowrap" }}>V1 - Final Cut v3.mp4</span>
                  </div>

                  {/* Audio Track */}
                  <div style={{ display: "flex", height: "14px", background: "rgba(14, 165, 233, 0.15)", border: "1px solid rgba(14, 165, 233, 0.25)", borderRadius: "4px", overflow: "hidden", alignItems: "center", padding: "0 6px" }}>
                    <span style={{ fontSize: "8px", fontWeight: 700, color: "#7dd3fc", whiteSpace: "nowrap" }}>A1 - Stereo Music Mix</span>
                  </div>
                </div>
              </div>

              {/* Timestamped Comment thread */}
              <div style={{ display: "flex", gap: "10px", marginBottom: "16px", background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.04)", borderRadius: "14px", padding: "10px 12px" }}>
                <div style={{
                  width: "28px", height: "28px", borderRadius: "50%",
                  background: "linear-gradient(135deg, #0ea5e9, #8b5cf6)",
                  display: "flex", alignItems: "center", justifyContent: "center",
                  fontSize: "11px", fontWeight: 800, color: "white", flexShrink: 0,
                  boxShadow: "0 4px 10px rgba(14,165,233,0.25)",
                }}>R</div>
                <div style={{ flex: 1 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: "6px", marginBottom: "3px" }}>
                    <span style={{ fontSize: "10.5px", fontWeight: 700, color: "#ffffff" }}>Rahul (Creator)</span>
                    <span style={{ fontSize: "8.5px", fontWeight: 700, color: "#38bdf8", background: "rgba(56,189,248,0.15)", padding: "1px 6px", borderRadius: "4px", fontFamily: "monospace" }}>1:24</span>
                  </div>
                  <p style={{ fontSize: "10px", color: "rgba(255,255,255,0.75)", lineHeight: 1.4, margin: 0 }}>
                    Looks great! Add a subtle fade-out at this point and it&apos;s ready to deliver.
                  </p>
                </div>
              </div>

              {/* Action buttons */}
              <div style={{ display: "flex", gap: "10px" }}>
                <button style={{
                  flex: 1,
                  background: "#ffffff",
                  color: "#05070f",
                  border: "none",
                  borderRadius: "12px",
                  padding: "10px 0",
                  fontSize: "11px",
                  fontWeight: 800,
                  cursor: "default",
                  boxShadow: "0 4px 12px rgba(255,255,255,0.15)",
                }}>✓ Approve Delivery</button>
                <button style={{
                  flex: 1,
                  background: "rgba(255,255,255,0.06)",
                  color: "rgba(255,255,255,0.8)",
                  border: "1px solid rgba(255,255,255,0.08)",
                  borderRadius: "12px",
                  padding: "10px 0",
                  fontSize: "11px",
                  fontWeight: 700,
                  cursor: "default",
                  transition: "background 0.2s",
                }}>Request Revision</button>
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
