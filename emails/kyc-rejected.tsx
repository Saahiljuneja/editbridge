import { Button, Heading, Text, Section } from "@react-email/components";
import { BaseLayout } from "./base-layout";

interface KycRejectedProps {
  editorName: string;
  reason: string;
  appUrl: string;
}

export function KycRejected({ editorName, reason, appUrl }: KycRejectedProps) {
  return (
    <BaseLayout preview="Your KYC application needs attention">
      <Heading style={h1}>KYC application update</Heading>
      <Text style={text}>Hi {editorName},</Text>
      <Text style={text}>
        Unfortunately, your identity verification could not be approved at this
        time. Please review the reason below and resubmit with the correct
        documents.
      </Text>

      <Text style={reasonLabel}>Reason for rejection</Text>
      <Section style={reasonBox}>
        <Text style={reasonText}>{reason}</Text>
      </Section>

      <Text style={text}>
        Common issues include blurry images, mismatched names, or expired
        documents. Please ensure your documents are clear and up to date before
        resubmitting.
      </Text>

      <Button href={`${appUrl}/editor/kyc`} style={button}>
        Resubmit KYC
      </Button>
    </BaseLayout>
  );
}

const h1: React.CSSProperties = { fontSize: "22px", fontWeight: "700", margin: "0 0 16px", color: "#0a0a0a" };
const text: React.CSSProperties = { fontSize: "15px", lineHeight: "24px", color: "#374151", margin: "0 0 14px" };
const reasonLabel: React.CSSProperties = { fontSize: "13px", fontWeight: "600", color: "#374151", margin: "0 0 6px" };
const reasonBox: React.CSSProperties = { backgroundColor: "#fef2f2", borderRadius: "6px", padding: "14px", margin: "0 0 20px", borderLeft: "3px solid #ef4444" };
const reasonText: React.CSSProperties = { fontSize: "13px", lineHeight: "20px", color: "#374151", margin: "0" };
const button: React.CSSProperties = { backgroundColor: "#0F6E56", borderRadius: "6px", color: "#fff", fontSize: "14px", fontWeight: "600", padding: "12px 24px", textDecoration: "none", display: "inline-block" };
