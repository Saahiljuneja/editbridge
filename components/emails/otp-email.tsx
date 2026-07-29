import * as React from "react";

export function OtpEmailTemplate({ name, otp, platformName = "EditBridge", emailHeaderColor = "#07050f" }: { name: string; otp: string; platformName?: string; emailHeaderColor?: string }) {
  const digits = otp.split("");
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
                <tr>
                  <td style={{ backgroundColor: emailHeaderColor, padding: "32px 40px" }}>
                    <p style={{ margin: 0, fontSize: 22, fontWeight: 800, color: "#ffffff", letterSpacing: "-0.5px" }}>
                      {platformName}
                    </p>
                  </td>
                </tr>
                <tr>
                  <td style={{ padding: "36px 40px" }}>
                    <p style={{ margin: "0 0 8px", fontSize: 20, fontWeight: 700, color: "#111827" }}>
                      Your verification code
                    </p>
                    <p style={{ margin: "0 0 28px", fontSize: 14, color: "#6b7280", lineHeight: 1.6 }}>
                      Hi {name}, enter the code below to verify your email and activate your {platformName} account.
                    </p>

                    {/* OTP digits */}
                    <table cellPadding={0} cellSpacing={0} style={{ marginBottom: 28 }}>
                      <tr>
                        {digits.map((d, i) => (
                          <td key={i} style={{ paddingRight: i < digits.length - 1 ? 8 : 0 }}>
                            <div style={{
                              width: 48,
                              height: 56,
                              backgroundColor: "#f5f3ff",
                              border: "2px solid #c4b5fd",
                              borderRadius: 10,
                              fontSize: 28,
                              fontWeight: 800,
                              color: "#4A3FB5",
                              textAlign: "center",
                              lineHeight: "56px",
                              letterSpacing: 0,
                            }}>{d}</div>
                          </td>
                        ))}
                      </tr>
                    </table>

                    <p style={{ margin: "0 0 0", fontSize: 12, color: "#9ca3af", lineHeight: 1.6 }}>
                      This code expires in <strong>10 minutes</strong>. If you didn&apos;t create a {platformName} account, you can safely ignore this email.
                    </p>
                  </td>
                </tr>
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
