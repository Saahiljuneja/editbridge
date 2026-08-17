import { Button, Heading, Text, Section, Row, Column } from "@react-email/components";
import { BaseLayout } from "./base-layout";

interface OrderCompletedProps {
  editorName: string;
  clientName: string;
  packageTitle: string;
  payout: string; // net amount formatted
  orderId: string;
  appUrl: string;
}

export function OrderCompleted({
  editorName,
  clientName,
  packageTitle,
  payout,
  orderId,
  appUrl,
}: OrderCompletedProps) {
  return (
    <BaseLayout preview={`${clientName} approved your delivery — payout incoming`}>
      <Heading style={h1}>Order approved — payout incoming!</Heading>
      <Text style={text}>Hi {editorName},</Text>
      <Text style={text}>
        Great news! <strong>{clientName}</strong> has approved your delivery for{" "}
        <strong>{packageTitle}</strong>. Your payout of{" "}
        <strong style={{ color: "#0F6E56" }}>{payout}</strong> has been
        initiated and will be transferred to your linked account.
      </Text>

      <Section style={infoBox}>
        <Row>
          <Column style={label}>Order</Column>
          <Column style={value}>{packageTitle}</Column>
        </Row>
        <Row>
          <Column style={label}>Client</Column>
          <Column style={value}>{clientName}</Column>
        </Row>
        <Row>
          <Column style={label}>Net payout</Column>
          <Column style={{ ...value, color: "#0F6E56" }}>{payout}</Column>
        </Row>
      </Section>

      <Text style={text}>
        Transfers typically settle within 1–3 business days. You can track your
        payout history from your payouts dashboard.
      </Text>

      <Button href={`${appUrl}/editor/payments`} style={button}>
        View payments
      </Button>
    </BaseLayout>
  );
}

const h1: React.CSSProperties = { fontSize: "22px", fontWeight: "700", margin: "0 0 16px", color: "#0a0a0a" };
const text: React.CSSProperties = { fontSize: "15px", lineHeight: "24px", color: "#374151", margin: "0 0 14px" };
const infoBox: React.CSSProperties = { backgroundColor: "#f0fdf4", borderRadius: "6px", padding: "16px", margin: "16px 0 20px", border: "1px solid #bbf7d0" };
const label: React.CSSProperties = { fontSize: "13px", color: "#6b7280", paddingBottom: "8px", width: "40%" };
const value: React.CSSProperties = { fontSize: "13px", color: "#111827", fontWeight: "500", paddingBottom: "8px" };
const button: React.CSSProperties = { backgroundColor: "#0F6E56", borderRadius: "6px", color: "#fff", fontSize: "14px", fontWeight: "600", padding: "12px 24px", textDecoration: "none", display: "inline-block" };
