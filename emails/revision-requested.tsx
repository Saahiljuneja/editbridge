import { Button, Heading, Text, Section } from "@react-email/components";
import { BaseLayout } from "./base-layout";

interface RevisionRequestedProps {
  editorName: string;
  clientName: string;
  packageTitle: string;
  feedbackText: string;
  revisionsRemaining: string; // "2 remaining" or "Unlimited"
  orderId: string;
  appUrl: string;
}

export function RevisionRequested({
  editorName,
  clientName,
  packageTitle,
  feedbackText,
  revisionsRemaining,
  orderId,
  appUrl,
}: RevisionRequestedProps) {
  return (
    <BaseLayout preview={`${clientName} has requested a revision — ${packageTitle}`}>
      <Heading style={h1}>Revision requested</Heading>
      <Text style={text}>Hi {editorName},</Text>
      <Text style={text}>
        <strong>{clientName}</strong> has requested a revision on your delivery
        for <strong>{packageTitle}</strong>. Please review their feedback below
        and submit an updated file.
      </Text>

      <Text style={feedbackLabel}>Client feedback</Text>
      <Section style={feedbackBox}>
        <Text style={feedbackText_}>{feedbackText}</Text>
      </Section>

      <Text style={meta}>Revisions remaining: {revisionsRemaining}</Text>

      <Button href={`${appUrl}/editor/orders/${orderId}`} style={button}>
        Submit revision
      </Button>
    </BaseLayout>
  );
}

const h1: React.CSSProperties = { fontSize: "22px", fontWeight: "700", margin: "0 0 16px", color: "#0a0a0a" };
const text: React.CSSProperties = { fontSize: "15px", lineHeight: "24px", color: "#374151", margin: "0 0 14px" };
const feedbackLabel: React.CSSProperties = { fontSize: "13px", fontWeight: "600", color: "#374151", margin: "0 0 6px" };
const feedbackBox: React.CSSProperties = { backgroundColor: "#fffbeb", borderRadius: "6px", padding: "14px", margin: "0 0 16px", borderLeft: "3px solid #f59e0b" };
const feedbackText_: React.CSSProperties = { fontSize: "13px", lineHeight: "20px", color: "#374151", margin: "0", whiteSpace: "pre-wrap" };
const meta: React.CSSProperties = { fontSize: "13px", color: "#6b7280", margin: "0 0 20px" };
const button: React.CSSProperties = { backgroundColor: "#0F6E56", borderRadius: "6px", color: "#fff", fontSize: "14px", fontWeight: "600", padding: "12px 24px", textDecoration: "none", display: "inline-block" };
