import { Button, Heading, Text, Section, Row, Column } from "@react-email/components";
import { BaseLayout } from "./base-layout";

interface OrderDeliveredProps {
  clientName: string;
  editorName: string;
  packageTitle: string;
  versionNumber: number;
  fileName: string;
  orderId: string;
  appUrl: string;
}

export function OrderDelivered({
  clientName,
  editorName,
  packageTitle,
  versionNumber,
  fileName,
  orderId,
  appUrl,
}: OrderDeliveredProps) {
  return (
    <BaseLayout preview={`${editorName} has delivered your order — ${packageTitle}`}>
      <Heading style={h1}>Your delivery is ready!</Heading>
      <Text style={text}>Hi {clientName},</Text>
      <Text style={text}>
        <strong>{editorName}</strong> has submitted a delivery for your{" "}
        <strong>{packageTitle}</strong> order. Please review it and either
        approve it or request a revision.
      </Text>

      <Section style={infoBox}>
        <Row>
          <Column style={label}>File</Column>
          <Column style={value}>{fileName}</Column>
        </Row>
        <Row>
          <Column style={label}>Version</Column>
          <Column style={value}>v{versionNumber}</Column>
        </Row>
      </Section>

      <Text style={text}>
        Once you approve, the payment will be released to the editor. If
        something isn&apos;t right, you can request a revision.
      </Text>

      <Button href={`${appUrl}/orders/${orderId}`} style={button}>
        Review delivery
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
