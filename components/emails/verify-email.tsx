import * as React from "react";

export function VerifyEmailTemplate({
  name,
  verifyUrl,
  platformName = "EditBridge",
  emailHeaderColor = "#07050f",
}: {
  name: string;
  verifyUrl: string;
  platformName?: string;
  emailHeaderColor?: string;
}) {
  return (
    <html>
      <head>
        <meta charSet="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
      </head>
      <body style={{ margin: 0, padding: 0, backgroundColor: "#f9fafb", fontFamily: "'Segoe UI', Arial, sans-serif" }}>
        <table width="100%" cellPadding={0} cellSpacing={0} style={{ backgroundColor: "#f9fafb", padding: "40px 16px" }}>
          <tr>
            <td align="center">
              <table width="100%" cellPadding={0} cellSpacing={0} style={{ maxWidth: 520, backgroundColor: "#ffffff", borderRadius: 16, overflow: "hidden", boxShadow: "0 1px 4px rgba(0,0,0,0.06)" }}>
                {/* Header */}
                <tr>
                  <td style={{ backgroundColor: emailHeaderColor, padding: "32px 40px" }}>
                    <p style={{ margin: 0, fontSize: 22, fontWeight: 800, color: "#ffffff", letterSpacing: "-0.5px" }}>
                      {platformName}
                    </p>
                  </td>
                </tr>

                {/* Body */}
                <tr>
                  <td style={{ padding: "36px 40px" }}>
                    <p style={{ margin: "0 0 8px", fontSize: 20, fontWeight: 700, color: "#111827" }}>
                      Verify your email address
                    </p>
                    <p style={{ margin: "0 0 28px", fontSize: 14, color: "#6b7280", lineHeight: 1.6 }}>
                      Hi {name}, thanks for signing up! Click the button below to verify your email and activate your EditBridge account.
                    </p>

                    <a
                      href={verifyUrl}
                      style={{
                        display: "inline-block",
                        backgroundColor: "#4A3FB5",
                        color: "#ffffff",
                        textDecoration: "none",
                        padding: "14px 32px",
                        borderRadius: 10,
                        fontSize: 14,
                        fontWeight: 600,
                      }}
                    >
                      Verify email address
                    </a>

                    <p style={{ margin: "28px 0 0", fontSize: 12, color: "#9ca3af", lineHeight: 1.6 }}>
                      This link expires in 24 hours. If you didn&apos;t create an EditBridge account, you can safely ignore this email.
                    </p>

                    <hr style={{ margin: "28px 0", border: "none", borderTop: "1px solid #f3f4f6" }} />

                    <p style={{ margin: 0, fontSize: 11, color: "#d1d5db" }}>
                      Or copy this link into your browser:<br />
                      <span style={{ color: "#9ca3af", wordBreak: "break-all" }}>{verifyUrl}</span>
                    </p>
                  </td>
                </tr>

                {/* Footer */}
                <tr>
                  <td style={{ backgroundColor: "#f9fafb", padding: "20px 40px", borderTop: "1px solid #f3f4f6" }}>
                    <p style={{ margin: 0, fontSize: 11, color: "#d1d5db", textAlign: "center" }}>
                      {platformName} · India&apos;s video editing marketplace
                    </p>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
        </table>
      </body>
    </html>
  );
}
