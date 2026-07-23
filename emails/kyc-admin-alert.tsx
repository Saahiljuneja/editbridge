import { Heading, Text, Button } from "@react-email/components";
import { BaseLayout } from "./base-layout";

export function KycAdminAlert({
  editorName,
  editorEmail,
  documentType,
  appUrl,
}: {
  editorName: string;
  editorEmail: string;
  documentType: string;
  appUrl: string;
}) {
  return (
    <BaseLayout preview={`New KYC submission from ${editorName}`}>
      <Heading style={{ fontSize: "20px", fontWeight: "700", margin: "0 0 12px", color: "#0a0a0a" }}>
        New KYC submission
      </Heading>
      <Text style={{ fontSize: "15px", color: "#374151", margin: "0 0 8px" }}>
        <strong>Editor:</strong> {editorName} ({editorEmail})
      </Text>
      <Text style={{ fontSize: "15px", color: "#374151", margin: "0 0 20px" }}>
        <strong>Document type:</strong> {documentType}
      </Text>
      <Button
        href={`${appUrl}/admin/kyc`}
        style={{ backgroundColor: "#0F6E56", borderRadius: "6px", color: "#fff", fontSize: "14px", fontWeight: "600", padding: "12px 24px", textDecoration: "none", display: "inline-block" }}
      >
        Review KYC
      </Button>
    </BaseLayout>
  );
}
