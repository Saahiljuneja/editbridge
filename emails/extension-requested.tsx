import { Button, Heading, Text, Section, Row, Column } from "@react-email/components";
import { BaseLayout } from "./base-layout";

interface ExtensionRequestedProps {
  clientName: string;
  editorName: string;
  packageTitle: string;
  extensionDays: number;
  reason: string;
  orderId: string;
  appUrl: string;
}

export function ExtensionRequested({
  clientName,
  editorName,
  packageTitle,
  extensionDays,
  reason,
  orderId,
  appUrl,
}: ExtensionRequestedProps) {
  return (
    <BaseLayout preview={`${editorName} requested ${extensionDays} more day${extensionDays !== 1 ? "s" : ""} for ${packageTitle}`}>
      <Heading style={h1}>Deadline extension requested</Heading>
      <Text style={text}>Hi {clientName},</Text>
      <Text style={text}>
        <strong>{editorName}</strong> has requested <strong>{extensionDays} extra day{extensionDays !== 1 ? "s" : ""}</strong> to
        complete your order — <strong>{packageTitle}</strong>.
      </Text>

      <Section style={infoBox}>
        <Row>
          <Column style={label}>Reason given</Column>
        </Row>
        <Row>
          <Column style={value}>&quot;{reason}&quot;</Column>
        </Row>
      </Section>

      <Text style={text}>
        You can approve or reject this request from your order page. If you don't respond, the
        original deadline stays in place.
      </Text>

      <Button href={`${appUrl}/orders/${orderId}`} style={button}>
        Review request
      </Button>
    </BaseLayout>
  );
}

const h1: React.CSSProperties = { fontSize: "22px", fontWeight: "700", margin: "0 0 16px", color: "#0a0a0a" };
const text: React.CSSProperties = { fontSize: "15px", lineHeight: "24px", color: "#374151", margin: "0 0 14px" };
const infoBox: React.CSSProperties = { backgroundColor: "#fffbeb", borderRadius: "6px", padding: "16px", margin: "16px 0 20px", border: "1px solid #fde68a" };
const label: React.CSSProperties = { fontSize: "11px", fontWeight: "700", color: "#92400e", textTransform: "uppercase", letterSpacing: "0.4px", paddingBottom: "6px" };
const value: React.CSSProperties = { fontSize: "14px", color: "#78350f", fontStyle: "italic" };
const button: React.CSSProperties = { backgroundColor: "#0EA5E9", borderRadius: "6px", color: "#fff", fontSize: "14px", fontWeight: "600", padding: "12px 24px", textDecoration: "none", display: "inline-block" };
