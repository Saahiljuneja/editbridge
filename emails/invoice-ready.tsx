import { Button, Heading, Text, Section, Row, Column } from "@react-email/components";
import { BaseLayout } from "./base-layout";

interface InvoiceReadyProps {
  recipientName: string;
  packageTitle: string;
  orderId: string;
  totalPaid: string;
  invoiceNumber: string;
  appUrl: string;
}

export function InvoiceReady({
  recipientName,
  packageTitle,
  orderId,
  totalPaid,
  invoiceNumber,
  appUrl,
}: InvoiceReadyProps) {
  return (
    <BaseLayout preview={`Your invoice for ${packageTitle} is ready to download`}>
      <Heading style={h1}>Your invoice is ready</Heading>
      <Text style={text}>Hi {recipientName},</Text>
      <Text style={text}>
        The tax invoice for your completed order — <strong>{packageTitle}</strong> — is
        now available. Download it below for your records or for GST claims.
      </Text>

      <Section style={infoBox}>
        <Row>
          <Column style={label}>Invoice</Column>
          <Column style={value}>{invoiceNumber}</Column>
        </Row>
        <Row>
          <Column style={label}>Order</Column>
          <Column style={value}>EB-{orderId}</Column>
        </Row>
        <Row>
          <Column style={label}>Amount paid</Column>
          <Column style={{ ...value, color: "#0369a1" }}>{totalPaid}</Column>
        </Row>
      </Section>

      <Button href={`${appUrl}/api/orders/${orderId}/invoice`} style={button}>
        Download Invoice (PDF)
      </Button>

      <Text style={note}>
        You can also access this invoice any time from the order page on EditBridge.
      </Text>
    </BaseLayout>
  );
}

const h1: React.CSSProperties = { fontSize: "22px", fontWeight: "700", margin: "0 0 16px", color: "#0a0a0a" };
const text: React.CSSProperties = { fontSize: "15px", lineHeight: "24px", color: "#374151", margin: "0 0 14px" };
const note: React.CSSProperties = { fontSize: "13px", lineHeight: "20px", color: "#9ca3af", margin: "14px 0 0" };
const infoBox: React.CSSProperties = { backgroundColor: "#f0f9ff", borderRadius: "6px", padding: "16px", margin: "16px 0 20px", border: "1px solid #bae6fd" };
const label: React.CSSProperties = { fontSize: "13px", color: "#6b7280", paddingBottom: "8px", width: "40%" };
const value: React.CSSProperties = { fontSize: "13px", color: "#111827", fontWeight: "500", paddingBottom: "8px" };
const button: React.CSSProperties = { backgroundColor: "#0EA5E9", borderRadius: "6px", color: "#fff", fontSize: "14px", fontWeight: "600", padding: "12px 24px", textDecoration: "none", display: "inline-block" };
