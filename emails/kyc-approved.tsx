import { Button, Heading, Text } from "@react-email/components";
import { BaseLayout } from "./base-layout";

interface KycApprovedProps {
  editorName: string;
  appUrl: string;
}

export function KycApproved({ editorName, appUrl }: KycApprovedProps) {
  return (
    <BaseLayout preview="Your KYC application has been approved — you can now accept orders">
      <Heading style={h1}>KYC approved — you&apos;re live!</Heading>
      <Text style={text}>Hi {editorName},</Text>
      <Text style={text}>
        Your identity verification has been reviewed and{" "}
        <strong style={{ color: "#0F6E56" }}>approved</strong>. Your profile is
        now visible to clients and you can start accepting orders.
      </Text>
      <Text style={text}>Here&apos;s what to do next:</Text>
      <Text style={listItem}>• Make sure your packages are active and priced competitively</Text>
      <Text style={listItem}>• Add portfolio samples to showcase your work</Text>
      <Text style={listItem}>• Keep your availability status up to date</Text>

      <Button href={`${appUrl}/editor/dashboard`} style={button}>
        Go to dashboard
      </Button>
    </BaseLayout>
  );
}

const h1: React.CSSProperties = { fontSize: "22px", fontWeight: "700", margin: "0 0 16px", color: "#0a0a0a" };
const text: React.CSSProperties = { fontSize: "15px", lineHeight: "24px", color: "#374151", margin: "0 0 12px" };
const listItem: React.CSSProperties = { fontSize: "14px", lineHeight: "22px", color: "#374151", margin: "0 0 4px", paddingLeft: "4px" };
const button: React.CSSProperties = { backgroundColor: "#0F6E56", borderRadius: "6px", color: "#fff", fontSize: "14px", fontWeight: "600", padding: "12px 24px", textDecoration: "none", display: "inline-block", marginTop: "16px" };
