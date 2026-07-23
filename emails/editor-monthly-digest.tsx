import { Button, Heading, Text, Section, Row, Column } from "@react-email/components";
import { BaseLayout } from "./base-layout";

interface EditorMonthlyDigestProps {
  editorName: string;
  monthLabel: string; // e.g. "June 2026"
  ordersCompleted: number;
  totalEarnings: string; // pre-formatted currency
  avgRating: number | null;
  appUrl: string;
}

export function EditorMonthlyDigest({
  editorName,
  monthLabel,
  ordersCompleted,
  totalEarnings,
  avgRating,
  appUrl,
}: EditorMonthlyDigestProps) {
  return (
    <BaseLayout preview={`Your ${monthLabel} recap — ${totalEarnings} earned`}>
      <Heading style={h1}>Your {monthLabel} recap</Heading>
      <Text style={text}>Hi {editorName},</Text>
      <Text style={text}>
        Here&apos;s how last month went on EditBridge.
      </Text>

      <Section style={infoBox}>
        <Row>
          <Column style={label}>Orders completed</Column>
          <Column style={value}>{ordersCompleted}</Column>
        </Row>
        <Row>
          <Column style={label}>Net earnings</Column>
          <Column style={{ ...value, color: "#0369a1" }}>{totalEarnings}</Column>
        </Row>
        {avgRating !== null && (
          <Row>
            <Column style={label}>Average rating</Column>
            <Column style={value}>{avgRating.toFixed(1)} ★</Column>
          </Row>
        )}
      </Section>

      <Text style={text}>
        Keep your availability up to date and respond quickly to new orders —
        both help you rank higher in client searches.
      </Text>

      <Button href={`${appUrl}/editor/analytics`} style={button}>
        View full analytics
      </Button>
    </BaseLayout>
  );
}

const h1: React.CSSProperties = { fontSize: "22px", fontWeight: "700", margin: "0 0 16px", color: "#0a0a0a" };
const text: React.CSSProperties = { fontSize: "15px", lineHeight: "24px", color: "#374151", margin: "0 0 14px" };
const infoBox: React.CSSProperties = { backgroundColor: "#f0f9ff", borderRadius: "6px", padding: "16px", margin: "16px 0 20px", border: "1px solid #bae6fd" };
const label: React.CSSProperties = { fontSize: "13px", color: "#6b7280", paddingBottom: "8px", width: "50%" };
const value: React.CSSProperties = { fontSize: "13px", color: "#111827", fontWeight: "600", paddingBottom: "8px" };
const button: React.CSSProperties = { backgroundColor: "#0EA5E9", borderRadius: "6px", color: "#fff", fontSize: "14px", fontWeight: "600", padding: "12px 24px", textDecoration: "none", display: "inline-block" };
