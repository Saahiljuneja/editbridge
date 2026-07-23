import { Button, Heading, Text } from "@react-email/components";
import { BaseLayout } from "./base-layout";

interface ExtensionDecisionProps {
  editorName: string;
  clientName: string;
  packageTitle: string;
  extensionDays: number;
  approved: boolean;
  orderId: string;
  appUrl: string;
}

export function ExtensionDecision({
  editorName,
  clientName,
  packageTitle,
  extensionDays,
  approved,
  orderId,
  appUrl,
}: ExtensionDecisionProps) {
  return (
    <BaseLayout preview={approved ? `Your extension request was approved` : `Your extension request was rejected`}>
      <Heading style={h1}>
        {approved ? "Extension approved ✅" : "Extension request rejected"}
      </Heading>
      <Text style={text}>Hi {editorName},</Text>
      {approved ? (
        <Text style={text}>
          <strong>{clientName}</strong> approved your request for{" "}
          <strong>{extensionDays} extra day{extensionDays !== 1 ? "s" : ""}</strong> on{" "}
          <strong>{packageTitle}</strong>. Your new deadline has been updated — check the order
          page for the exact date.
        </Text>
      ) : (
        <Text style={text}>
          <strong>{clientName}</strong> was not able to approve your extension request on{" "}
          <strong>{packageTitle}</strong>. The original deadline still applies — please plan your
          delivery accordingly.
        </Text>
      )}

      <Button href={`${appUrl}/editor/orders/${orderId}`} style={button}>
        View order
      </Button>
    </BaseLayout>
  );
}

const h1: React.CSSProperties = { fontSize: "22px", fontWeight: "700", margin: "0 0 16px", color: "#0a0a0a" };
const text: React.CSSProperties = { fontSize: "15px", lineHeight: "24px", color: "#374151", margin: "0 0 14px" };
const button: React.CSSProperties = { backgroundColor: "#0EA5E9", borderRadius: "6px", color: "#fff", fontSize: "14px", fontWeight: "600", padding: "12px 24px", textDecoration: "none", display: "inline-block" };
