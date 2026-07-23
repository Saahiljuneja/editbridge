import { Button, Heading, Text, Section, Row, Column } from "@react-email/components";
import { BaseLayout } from "./base-layout";

interface OrderPlacedEditorProps {
  editorName: string;
  clientName: string;
  packageTitle: string;
  payout: string; // net amount formatted
  deadline: string; // formatted date
  brief: string;
  orderId: string;
  appUrl: string;
}

export function OrderPlacedEditor({
  editorName,
  clientName,
  packageTitle,
  payout,
  deadline,
  brief,
  orderId,
  appUrl,
}: OrderPlacedEditorProps) {
  return (
    <BaseLayout preview={`New order from ${clientName} — ${packageTitle}`}>
      <Heading style={h1}>You have a new order!</Heading>
      <Text style={text}>Hi {editorName},</Text>
      <Text style={text}>
        <strong>{clientName}</strong> has placed an order for your{" "}
        <strong>{packageTitle}</strong> package. Start working on it right away
        to make a great first impression.
      </Text>

      <Section style={infoBox}>
        <Row>
          <Column style={label}>Package</Column>
          <Column style={value}>{packageTitle}</Column>
        </Row>
        <Row>
          <Column style={label}>Client</Column>
          <Column style={value}>{clientName}</Column>
        </Row>
        <Row>
          <Column style={label}>Your payout</Column>
          <Column style={value}>{payout}</Column>
        </Row>
        <Row>
          <Column style={label}>Deadline</Column>
          <Column style={value}>{deadline}</Column>
        </Row>
      </Section>

      <Text style={briefLabel}>Client brief</Text>
      <Section style={briefBox}>
        <Text style={briefText}>{brief}</Text>
      </Section>

      <Button href={`${appUrl}/editor/orders/${orderId}`} style={button}>
        View order
      </Button>
    </BaseLayout>
  );
}

const h1: React.CSSProperties = { fontSize: "22px", fontWeight: "700", margin: "0 0 16px", color: "#0a0a0a" };
const text: React.CSSProperties = { fontSize: "15px", lineHeight: "24px", color: "#374151", margin: "0 0 14px" };
const infoBox: React.CSSProperties = { backgroundColor: "#f9fafb", borderRadius: "6px", padding: "16px", margin: "16px 0 20px" };
const label: React.CSSProperties = { fontSize: "13px", color: "#6b7280", paddingBottom: "8px", width: "40%" };
const value: React.CSSProperties = { fontSize: "13px", color: "#111827", fontWeight: "500", paddingBottom: "8px" };
const briefLabel: React.CSSProperties = { fontSize: "13px", fontWeight: "600", color: "#374151", margin: "0 0 6px" };
const briefBox: React.CSSProperties = { backgroundColor: "#f9fafb", borderRadius: "6px", padding: "14px", margin: "0 0 20px", borderLeft: "3px solid #0F6E56" };
const briefText: React.CSSProperties = { fontSize: "13px", lineHeight: "20px", color: "#374151", margin: "0", whiteSpace: "pre-wrap" };
const button: React.CSSProperties = { backgroundColor: "#0F6E56", borderRadius: "6px", color: "#fff", fontSize: "14px", fontWeight: "600", padding: "12px 24px", textDecoration: "none", display: "inline-block" };
