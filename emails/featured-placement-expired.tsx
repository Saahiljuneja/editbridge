import { Button, Heading, Text } from "@react-email/components";
import { BaseLayout } from "./base-layout";

interface FeaturedPlacementExpiredProps {
  editorName: string;
  appUrl: string;
}

export function FeaturedPlacementExpired({ editorName, appUrl }: FeaturedPlacementExpiredProps) {
  return (
    <BaseLayout preview="Your featured placement has expired">
      <Heading style={h1}>Your featured placement has expired</Heading>
      <Text style={text}>Hi {editorName},</Text>
      <Text style={text}>
        Your featured placement on EditBridge&apos;s browse page has ended, and
        your listing is back to its regular position in search results.
      </Text>
      <Text style={text}>
        Renew now to get back to the top of search results and stay ahead of
        the competition.
      </Text>

      <Button href={`${appUrl}/editor/featured`} style={button}>
        Renew featured placement
      </Button>

      <Text style={note}>
        You&apos;re receiving this because you previously purchased featured
        placement on EditBridge.
      </Text>
    </BaseLayout>
  );
}

const h1: React.CSSProperties = { fontSize: "22px", fontWeight: "700", margin: "0 0 16px", color: "#0a0a0a" };
const text: React.CSSProperties = { fontSize: "15px", lineHeight: "24px", color: "#374151", margin: "0 0 14px" };
const note: React.CSSProperties = { fontSize: "13px", lineHeight: "20px", color: "#9ca3af", margin: "18px 0 0" };
const button: React.CSSProperties = { backgroundColor: "#0EA5E9", borderRadius: "6px", color: "#fff", fontSize: "14px", fontWeight: "600", padding: "12px 24px", textDecoration: "none", display: "inline-block" };
