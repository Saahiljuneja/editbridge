import { Button, Heading, Text } from "@react-email/components";
import { BaseLayout } from "./base-layout";

interface EditorAvailableProps {
  clientName: string;
  editorName: string;
  editorId: string;
  appUrl: string;
}

export function EditorAvailable({
  clientName,
  editorName,
  editorId,
  appUrl,
}: EditorAvailableProps) {
  return (
    <BaseLayout preview={`${editorName} is now taking orders again`}>
      <Heading style={h1}>{editorName} is back and taking orders!</Heading>
      <Text style={text}>Hi {clientName},</Text>
      <Text style={text}>
        Good news — <strong>{editorName}</strong>, one of your saved editors on
        EditBridge, is now accepting new orders again. If you have a video
        that needs their touch, now&apos;s a great time to book.
      </Text>

      <Button href={`${appUrl}/editor/${editorId}`} style={button}>
        View {editorName}&apos;s profile
      </Button>

      <Text style={note}>
        You&apos;re receiving this because you saved this editor on EditBridge.
        Unsave them any time from your saved editors list.
      </Text>
    </BaseLayout>
  );
}

const h1: React.CSSProperties = { fontSize: "22px", fontWeight: "700", margin: "0 0 16px", color: "#0a0a0a" };
const text: React.CSSProperties = { fontSize: "15px", lineHeight: "24px", color: "#374151", margin: "0 0 14px" };
const note: React.CSSProperties = { fontSize: "13px", lineHeight: "20px", color: "#9ca3af", margin: "18px 0 0" };
const button: React.CSSProperties = { backgroundColor: "#0EA5E9", borderRadius: "6px", color: "#fff", fontSize: "14px", fontWeight: "600", padding: "12px 24px", textDecoration: "none", display: "inline-block" };
