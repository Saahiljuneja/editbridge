import { Button, Heading, Text } from "@react-email/components";
import { BaseLayout } from "./base-layout";

interface InactiveClientReminderProps {
  clientName: string;
  appUrl: string;
}

export function InactiveClientReminder({ clientName, appUrl }: InactiveClientReminderProps) {
  return (
    <BaseLayout preview="We miss you — here's what's new on EditBridge">
      <Heading style={h1}>We miss you, {clientName}</Heading>
      <Text style={text}>
        It&apos;s been a while since your last order on EditBridge. Our marketplace
        of KYC-verified editors keeps growing — there&apos;s a good chance the
        perfect editor for your next project is waiting.
      </Text>
      <Text style={text}>
        Every order is protected by escrow, so you only pay for work you approve.
      </Text>

      <Button href={`${appUrl}/browse`} style={button}>
        Browse editors
      </Button>

      <Text style={note}>
        You&apos;re receiving this because you have an EditBridge account.
        Manage your email preferences from your account settings.
      </Text>
    </BaseLayout>
  );
}

const h1: React.CSSProperties = { fontSize: "22px", fontWeight: "700", margin: "0 0 16px", color: "#0a0a0a" };
const text: React.CSSProperties = { fontSize: "15px", lineHeight: "24px", color: "#374151", margin: "0 0 14px" };
const note: React.CSSProperties = { fontSize: "13px", lineHeight: "20px", color: "#9ca3af", margin: "18px 0 0" };
const button: React.CSSProperties = { backgroundColor: "#0EA5E9", borderRadius: "6px", color: "#fff", fontSize: "14px", fontWeight: "600", padding: "12px 24px", textDecoration: "none", display: "inline-block" };
