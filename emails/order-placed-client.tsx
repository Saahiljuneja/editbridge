import { Button, Heading, Text, Section, Row, Column } from "@react-email/components";
import { BaseLayout } from "./base-layout";

interface OrderPlacedClientProps {
  clientName: string;
  editorName: string;
  packageTitle: string;
  totalAmount: string; // formatted, e.g. "₹2,500"
  orderId: string;
  appUrl: string;
}

export function OrderPlacedClient({
  clientName,
  editorName,
  packageTitle,
  totalAmount,
  orderId,
  appUrl,
}: OrderPlacedClientProps) {
  return (
    <BaseLayout preview={`Order confirmed — ${packageTitle} with ${editorName}`}>
      <Heading style={h1}>Order confirmed!</Heading>
      <Text style={text}>Hi {clientName},</Text>
      <Text style={text}>
        Your order has been placed successfully and is now in the editor&apos;s
        queue. Your payment of <strong>{totalAmount}</strong> is held securely
        in escrow and will only be released when you approve the delivery.
      </Text>

      <Section style={infoBox}>
        <Row>
          <Column style={label}>Package</Column>
          <Column style={value}>{packageTitle}</Column>
        </Row>
        <Row>
          <Column style={label}>Editor</Column>
          <Column style={value}>{editorName}</Column>
        </Row>
        <Row>
          <Column style={label}>Amount paid</Column>
          <Column style={value}>{totalAmount}</Column>
        </Row>
      </Section>

      <Text style={text}>
        You can track your order, chat with your editor, and approve the
        delivery from your orders dashboard.
      </Text>

      <Button href={`${appUrl}/orders/${orderId}`} style={button}>
        View my order
      </Button>
    </BaseLayout>
  );
}

const h1: React.CSSProperties = { fontSize: "22px", fontWeight: "700", margin: "0 0 16px", color: "#0a0a0a" };
const text: React.CSSProperties = { fontSize: "15px", lineHeight: "24px", color: "#374151", margin: "0 0 14px" };
const infoBox: React.CSSProperties = { backgroundColor: "#f9fafb", borderRadius: "6px", padding: "16px", margin: "16px 0 20px" };
const label: React.CSSProperties = { fontSize: "13px", color: "#6b7280", paddingBottom: "8px", width: "40%" };
const value: React.CSSProperties = { fontSize: "13px", color: "#111827", fontWeight: "500", paddingBottom: "8px" };
const button: React.CSSProperties = { backgroundColor: "#0F6E56", borderRadius: "6px", color: "#fff", fontSize: "14px", fontWeight: "600", padding: "12px 24px", textDecoration: "none", display: "inline-block" };
