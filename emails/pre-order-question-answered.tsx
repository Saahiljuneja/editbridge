import { Button, Heading, Text, Section, Row, Column } from "@react-email/components";
import { BaseLayout } from "./base-layout";

interface PreOrderQuestionAnsweredProps {
  clientName: string;
  editorName: string;
  question: string;
  answer: string;
  editorId: string;
  appUrl: string;
}

export function PreOrderQuestionAnswered({
  clientName,
  editorName,
  question,
  answer,
  editorId,
  appUrl,
}: PreOrderQuestionAnsweredProps) {
  return (
    <BaseLayout preview={`${editorName} answered your question`}>
      <Heading style={h1}>{editorName} answered your question</Heading>
      <Text style={text}>Hi {clientName},</Text>
      <Text style={text}>
        <strong>{editorName}</strong> replied to the question you asked before ordering.
      </Text>

      <Section style={infoBox}>
        <Row>
          <Column style={label}>You asked</Column>
        </Row>
        <Row>
          <Column style={questionValue}>&quot;{question}&quot;</Column>
        </Row>
        <Row>
          <Column style={{ ...label, paddingTop: "12px" }}>Their answer</Column>
        </Row>
        <Row>
          <Column style={answerValue}>{answer}</Column>
        </Row>
      </Section>

      <Button href={`${appUrl}/editor/${editorId}`} style={button}>
        View profile &amp; order
      </Button>
    </BaseLayout>
  );
}

const h1: React.CSSProperties = { fontSize: "22px", fontWeight: "700", margin: "0 0 16px", color: "#0a0a0a" };
const text: React.CSSProperties = { fontSize: "15px", lineHeight: "24px", color: "#374151", margin: "0 0 14px" };
const infoBox: React.CSSProperties = { backgroundColor: "#f9fafb", borderRadius: "6px", padding: "16px", margin: "16px 0 20px", border: "1px solid #e5e7eb" };
const label: React.CSSProperties = { fontSize: "11px", fontWeight: "700", color: "#6b7280", textTransform: "uppercase", letterSpacing: "0.4px", paddingBottom: "6px" };
const questionValue: React.CSSProperties = { fontSize: "14px", color: "#374151", fontStyle: "italic" };
const answerValue: React.CSSProperties = { fontSize: "14px", color: "#0c4a6e", fontWeight: "500" };
const button: React.CSSProperties = { backgroundColor: "#0EA5E9", borderRadius: "6px", color: "#fff", fontSize: "14px", fontWeight: "600", padding: "12px 24px", textDecoration: "none", display: "inline-block" };
