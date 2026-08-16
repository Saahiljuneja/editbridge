import * as React from "react";

export function OfflineMessagesEmailTemplate({
  name,
  items,
  platformName = "EditBridge",
  emailHeaderColor = "#07050f",
}: {
  name: string;
  items: Array<{ content: string; senderName: string; orderId: string }>;
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
                      You have unread messages
                    </p>
                    <p style={{ margin: "0 0 24px", fontSize: 14, color: "#6b7280", lineHeight: 1.6 }}>
                      Hi {name}, you have received new messages on {platformName} while you were away.
                    </p>

                    {/* Messages List */}
                    <div style={{ marginBottom: 28 }}>
                      {items.map((item, idx) => (
                        <div key={idx} style={{
                          padding: "16px",
                          backgroundColor: "#f5f3ff",
                          border: "1px solid #c4b5fd",
                          borderRadius: 12,
                          marginBottom: idx < items.length - 1 ? 12 : 0,
                        }}>
                          <p style={{ margin: "0 0 6px", fontSize: 12, fontWeight: 700, color: "#4A3FB5" }}>
                            {item.senderName}
                          </p>
                          <p style={{ margin: 0, fontSize: 13, color: "#374151", lineHeight: 1.5, fontStyle: "italic" }}>
                            &ldquo;{item.content}&rdquo;
                          </p>
                        </div>
                      ))}
                    </div>

                    {/* Action Button */}
                    <table width="100%" cellPadding={0} cellSpacing={0}>
                      <tr>
                        <td align="center">
                          <a
                            href={`${process.env.NEXT_PUBLIC_APP_URL}/messages`}
                            style={{
                              display: "inline-block",
                              padding: "12px 24px",
                              backgroundColor: "#1e40af",
                              color: "#ffffff",
                              fontSize: 14,
                              fontWeight: 700,
                              textDecoration: "none",
                              borderRadius: 10,
                              boxShadow: "0 2px 4px rgba(14, 165, 233, 0.2)",
                            }}
                          >
                            Reply to Messages
                          </a>
                        </td>
                      </tr>
                    </table>
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
