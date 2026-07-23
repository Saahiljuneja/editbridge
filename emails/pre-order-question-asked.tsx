import { Button, Heading, Text, Section, Row, Column } from "@react-email/components";
import { BaseLayout } from "./base-layout";

interface PreOrderQuestionAskedProps {
  editorName: string;
  clientName: string;
  question: string;
  appUrl: string;
}

export function PreOrderQuestionAsked({
  editorName,
  clientName,
  question,
  appUrl,
}: PreOrderQuestionAskedProps) {
  return (
    <BaseLayout preview={`${clientName} asked you a question before ordering`}>
      <Heading style={h1}>A client has a question before ordering</Heading>
      <Text style={text}>Hi {editorName},</Text>
      <Text style={text}>
        <strong>{clientName}</strong> is considering placing an order with you and asked a question first.
      </Text>

      <Section style={infoBox}>
        <Row>
          <Column style={label}>Their question</Column>
        </Row>
        <Row>
          <Column style={value}>&quot;{question}&quot;</Column>
        </Row>
      </Section>

      <Text style={text}>
        Answering quickly (within 24 hours) helps turn interest into a booked order — your answer
        also stays on your profile to build trust with future clients.
      </Text>

      <Button href={`${appUrl}/editor/questions`} style={button}>
        Answer question
      </Button>
    </BaseLayout>
  );
}

const h1: React.CSSProperties = { fontSize: "22px", fontWeight: "700", margin: "0 0 16px", color: "#0a0a0a" };
const text: React.CSSProperties = { fontSize: "15px", lineHeight: "24px", color: "#374151", margin: "0 0 14px" };
const infoBox: React.CSSProperties = { backgroundColor: "#f0f9ff", borderRadius: "6px", padding: "16px", margin: "16px 0 20px", border: "1px solid #bae6fd" };
const label: React.CSSProperties = { fontSize: "11px", fontWeight: "700", color: "#075985", textTransform: "uppercase", letterSpacing: "0.4px", paddingBottom: "6px" };
const value: React.CSSProperties = { fontSize: "14px", color: "#0c4a6e", fontStyle: "italic" };
const button: React.CSSProperties = { backgroundColor: "#0EA5E9", borderRadius: "6px", color: "#fff", fontSize: "14px", fontWeight: "600", padding: "12px 24px", textDecoration: "none", display: "inline-block" };
