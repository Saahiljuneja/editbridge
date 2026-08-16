import { ImageResponse } from "next/og";

export const alt = "EditBridge — Hire Verified Video Editors";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

async function loadFont(): Promise<ArrayBuffer | null> {
  try {
    const css = await fetch(
      "https://fonts.googleapis.com/css2?family=Rubik:wght@700&display=swap",
      { headers: { "User-Agent": "Mozilla/5.0 (compatible; Googlebot/2.1)" } }
    ).then((r) => r.text());
    const urlMatch = css.match(/url\(([^)]+)\)/);
    if (!urlMatch?.[1]) return null;
    return fetch(urlMatch[1]).then((r) => r.arrayBuffer());
  } catch {
    return null;
  }
}

export default async function OGImage() {
  const fontData = await loadFont();
  const fonts = fontData
    ? [{ name: "Rubik", data: fontData, style: "normal" as const, weight: 700 as const }]
    : [];

  const ff = fontData ? "Rubik" : "system-ui, sans-serif";

  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          background: "#09090b",
          padding: "60px 80px",
          position: "relative",
          overflow: "hidden",
          fontFamily: ff,
        }}
      >
        {/* Accent blob — top right */}
        <div
          style={{
            position: "absolute",
            top: -180,
            right: -140,
            width: 560,
            height: 560,
            borderRadius: "50%",
            background: "#1e40af",
            opacity: 0.12,
          }}
        />
        {/* Accent blob — bottom left */}
        <div
          style={{
            position: "absolute",
            bottom: -200,
            left: -80,
            width: 420,
            height: 420,
            borderRadius: "50%",
            background: "#7C3AED",
            opacity: 0.09,
          }}
        />

        {/* Top: Wordmark */}
        <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
          <div
            style={{
              width: 48,
              height: 48,
              borderRadius: 14,
              background: "#1e40af",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              color: "white",
              fontSize: 20,
              fontWeight: 700,
              letterSpacing: -0.5,
            }}
          >
            EB
          </div>
          <span
            style={{
              color: "white",
              fontSize: 26,
              fontWeight: 700,
              letterSpacing: -0.5,
            }}
          >
            EditBridge
          </span>
        </div>

        {/* Center: Headline + sub */}
        <div style={{ display: "flex", flexDirection: "column", gap: 18 }}>
          <div style={{ display: "flex", flexDirection: "column", gap: 0 }}>
            <span
              style={{
                fontSize: 88,
                fontWeight: 700,
                color: "white",
                lineHeight: 1.05,
                letterSpacing: -3,
              }}
            >
              Hire Verified
            </span>
            <span
              style={{
                fontSize: 88,
                fontWeight: 700,
                color: "#1e40af",
                lineHeight: 1.05,
                letterSpacing: -3,
              }}
            >
              Video Editors
            </span>
          </div>
          <span
            style={{
              fontSize: 26,
              color: "#888888",
              letterSpacing: -0.2,
              lineHeight: 1.4,
            }}
          >
            KYC-verified editors · Escrow-protected payments · On-time delivery
          </span>
        </div>

        {/* Bottom: Trust badges */}
        <div style={{ display: "flex", gap: 14 }}>
          {["KYC Verified", "Escrow Safe", "100+ Editors"].map((label) => (
            <div
              key={label}
              style={{
                display: "flex",
                alignItems: "center",
                gap: 10,
                padding: "10px 22px",
                borderRadius: 100,
                border: "1px solid #2a2a2a",
                color: "#aaaaaa",
                fontSize: 18,
                fontWeight: 600,
              }}
            >
              <div
                style={{
                  width: 10,
                  height: 10,
                  borderRadius: "50%",
                  background: "#0F6E56",
                }}
              />
              <span>{label}</span>
            </div>
          ))}
        </div>

        {/* Bottom accent bar */}
        <div
          style={{
            position: "absolute",
            bottom: 0,
            left: 0,
            right: 0,
            height: 4,
            background: "#1e40af",
          }}
        />
      </div>
    ),
    { ...size, fonts }
  );
}
