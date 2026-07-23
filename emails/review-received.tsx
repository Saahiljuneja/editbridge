import { Button, Heading, Text, Section } from "@react-email/components";
import { BaseLayout } from "./base-layout";

interface ReviewReceivedProps {
  recipientName: string;
  reviewerName: string;
  packageTitle: string;
  rating: number;
  reviewText?: string;
  reviewId: string;
  appUrl: string;
}

export function ReviewReceived({
  recipientName,
  reviewerName,
  packageTitle,
  rating,
  reviewText,
  reviewId,
  appUrl,
}: ReviewReceivedProps) {
  const stars = "★".repeat(rating) + "☆".repeat(5 - rating);

  return (
    <BaseLayout preview={`${reviewerName} left you a ${rating}-star review`}>
      <Heading style={h1}>You received a review!</Heading>
      <Text style={text}>Hi {recipientName},</Text>
      <Text style={text}>
        <strong>{reviewerName}</strong> left a review for your work on{" "}
        <strong>{packageTitle}</strong>.
      </Text>

      <Section style={reviewBox}>
        <Text style={stars_}>{stars}</Text>
        {reviewText && <Text style={reviewText_}>&quot;{reviewText}&quot;</Text>}
        <Text style={reviewerLabel}>— {reviewerName}</Text>
      </Section>

      <Text style={text}>
        You can reply to this review from your profile page.
      </Text>

      <Button href={`${appUrl}/editor/profile`} style={button}>
        View review
      </Button>
    </BaseLayout>
  );
}

const h1: React.CSSProperties = { fontSize: "22px", fontWeight: "700", margin: "0 0 16px", color: "#0a0a0a" };
const text: React.CSSProperties = { fontSize: "15px", lineHeight: "24px", color: "#374151", margin: "0 0 14px" };
const reviewBox: React.CSSProperties = { backgroundColor: "#f9fafb", borderRadius: "6px", padding: "20px", margin: "0 0 20px", borderLeft: "3px solid #f59e0b" };
const stars_: React.CSSProperties = { fontSize: "20px", color: "#f59e0b", margin: "0 0 8px", letterSpacing: "2px" };
const reviewText_: React.CSSProperties = { fontSize: "15px", lineHeight: "24px", color: "#374151", fontStyle: "italic", margin: "0 0 8px" };
const reviewerLabel: React.CSSProperties = { fontSize: "13px", color: "#6b7280", margin: "0" };
const button: React.CSSProperties = { backgroundColor: "#0F6E56", borderRadius: "6px", color: "#fff", fontSize: "14px", fontWeight: "600", padding: "12px 24px", textDecoration: "none", display: "inline-block" };
