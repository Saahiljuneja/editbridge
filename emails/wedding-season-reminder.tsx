import { Button, Heading, Text } from "@react-email/components";
import { BaseLayout } from "./base-layout";

interface WeddingSeasonReminderProps {
  clientName: string;
  appUrl: string;
}

export function WeddingSeasonReminder({ clientName, appUrl }: WeddingSeasonReminderProps) {
  return (
    <BaseLayout preview="Wedding season is here — book your editor early">
      <Heading style={h1}>Wedding season is here 💍</Heading>
      <Text style={text}>Hi {clientName},</Text>
      <Text style={text}>
        It&apos;s that time of year again — wedding editors on EditBridge are
        booking up fast. Since you&apos;ve worked with us before, we wanted to
        give you a head start before calendars fill up.
      </Text>
      <Text style={text}>
        Whether it&apos;s a highlight reel, a full ceremony edit, or reels for
        social media, browse trusted wedding editors and lock in your dates early.
      </Text>

      <Button href={`${appUrl}/browse?niche=wedding`} style={button}>
        Browse wedding editors
      </Button>

      <Text style={note}>
        You&apos;re receiving this because you&apos;ve booked a wedding edit with
        EditBridge before.
      </Text>
    </BaseLayout>
  );
}

const h1: React.CSSProperties = { fontSize: "22px", fontWeight: "700", margin: "0 0 16px", color: "#0a0a0a" };
const text: React.CSSProperties = { fontSize: "15px", lineHeight: "24px", color: "#374151", margin: "0 0 14px" };
const note: React.CSSProperties = { fontSize: "13px", lineHeight: "20px", color: "#9ca3af", margin: "18px 0 0" };
const button: React.CSSProperties = { backgroundColor: "#0EA5E9", borderRadius: "6px", color: "#fff", fontSize: "14px", fontWeight: "600", padding: "12px 24px", textDecoration: "none", display: "inline-block" };
