import { Button, Heading, Text, Section, Row, Column } from "@react-email/components";
import { BaseLayout } from "./base-layout";

interface OrderCancelledProps {
  recipientName: string;
  packageTitle: string;
  cancelledBy: string; // "client" | "editor"
  refundAmount?: string; // only shown to client
  orderId: string;
  appUrl: string;
}

export function OrderCancelled({
  recipientName,
  packageTitle,
  cancelledBy,
  refundAmount,
  orderId,
  appUrl,
}: OrderCancelledProps) {
  const byClient = cancelledBy === "client";

  return (
    <BaseLayout preview={`Order cancelled — ${packageTitle}`}>
      <Heading style={h1}>Order cancelled</Heading>
      <Text style={text}>Hi {recipientName},</Text>
      <Text style={text}>
        The order for <strong>{packageTitle}</strong> has been cancelled by the{" "}
        {byClient ? "client" : "editor"}.
      </Text>

      {refundAmount && (
        <Section style={infoBox}>
          <Row>
            <Column style={label}>Refund</Column>
            <Column style={value}>{refundAmount}</Column>
          </Row>
          <Row>
            <Column style={label}>Timeline</Column>
            <Column style={value}>5–7 business days to your original payment method</Column>
          </Row>
        </Section>
      )}

      <Text style={text}>
        {refundAmount
          ? "Your payment will be refunded automatically. No further action is needed."
          : "You can browse other clients or update your packages from your dashboard."}
      </Text>

      <Button href={`${appUrl}/orders/${orderId}`} style={button}>
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
const button: React.CSSProperties = { backgroundColor: "#6b7280", borderRadius: "6px", color: "#fff", fontSize: "14px", fontWeight: "600", padding: "12px 24px", textDecoration: "none", display: "inline-block" };
