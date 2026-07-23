import { Button, Heading, Text, Section } from "@react-email/components";
import { BaseLayout } from "./base-layout";

interface DisputeOpenedProps {
  recipientName: string;
  openerName: string;
  packageTitle: string;
  reason: string;
  disputeId: string;
  orderId: string;
  appUrl: string;
  isAdmin?: boolean;
}

export function DisputeOpened({
  recipientName,
  openerName,
  packageTitle,
  reason,
  disputeId,
  orderId,
  appUrl,
  isAdmin = false,
}: DisputeOpenedProps) {
  return (
    <BaseLayout preview={`Dispute opened on order — ${packageTitle}`}>
      <Heading style={h1}>A dispute has been opened</Heading>
      <Text style={text}>Hi {recipientName},</Text>
      <Text style={text}>
        {isAdmin ? (
          <>
            A dispute has been opened by <strong>{openerName}</strong> on the
            order for <strong>{packageTitle}</strong>. Please review and resolve
            within 48 hours.
          </>
        ) : (
          <>
            <strong>{openerName}</strong> has opened a dispute on the order for{" "}
            <strong>{packageTitle}</strong>. Our support team will review the
            case and reach out within 48 hours. In the meantime, please avoid
            any further changes to the order.
          </>
        )}
      </Text>

      <Text style={reasonLabel}>Reason provided</Text>
      <Section style={reasonBox}>
        <Text style={reasonText}>{reason}</Text>
      </Section>

      <Text style={text}>
        Our team will contact both parties if additional information is needed.
      </Text>

      <Button
        href={isAdmin ? `${appUrl}/admin/disputes/${disputeId}` : `${appUrl}/disputes/${disputeId}`}
        style={button}
      >
        {isAdmin ? "Review dispute" : "View dispute"}
      </Button>
    </BaseLayout>
  );
}

const h1: React.CSSProperties = { fontSize: "22px", fontWeight: "700", margin: "0 0 16px", color: "#0a0a0a" };
const text: React.CSSProperties = { fontSize: "15px", lineHeight: "24px", color: "#374151", margin: "0 0 14px" };
const reasonLabel: React.CSSProperties = { fontSize: "13px", fontWeight: "600", color: "#374151", margin: "0 0 6px" };
const reasonBox: React.CSSProperties = { backgroundColor: "#fef2f2", borderRadius: "6px", padding: "14px", margin: "0 0 20px", borderLeft: "3px solid #ef4444" };
const reasonText: React.CSSProperties = { fontSize: "13px", lineHeight: "20px", color: "#374151", margin: "0", whiteSpace: "pre-wrap" };
const button: React.CSSProperties = { backgroundColor: "#ef4444", borderRadius: "6px", color: "#fff", fontSize: "14px", fontWeight: "600", padding: "12px 24px", textDecoration: "none", display: "inline-block" };
