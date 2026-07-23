import {
  Body,
  Container,
  Head,
  Html,
  Preview,
  Section,
  Text,
  Hr,
  Img,
} from "@react-email/components";
import type { ReactNode } from "react";

interface BaseLayoutProps {
  preview: string;
  children: ReactNode;
}

export function BaseLayout({ preview, children }: BaseLayoutProps) {
  return (
    <Html>
      <Head />
      <Preview>{preview}</Preview>
      <Body style={body}>
        <Container style={container}>
          {/* Logo / wordmark */}
          <Section style={header}>
            <Text style={logo}>EditBridge</Text>
          </Section>

          {/* Content */}
          <Section style={content}>{children}</Section>

          {/* Footer */}
          <Hr style={hr} />
          <Section style={footer}>
            <Text style={footerText}>
              © {new Date().getFullYear()} EditBridge · India's marketplace for
              video editors and thumbnail designers.
            </Text>
            <Text style={footerText}>
              You received this email because you have an account on EditBridge.
            </Text>
          </Section>
        </Container>
      </Body>
    </Html>
  );
}

const body: React.CSSProperties = {
  backgroundColor: "#f6f9fc",
  fontFamily:
    '-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,Oxygen,Ubuntu,sans-serif',
};

const container: React.CSSProperties = {
  backgroundColor: "#ffffff",
  margin: "40px auto",
  padding: "0",
  borderRadius: "8px",
  maxWidth: "560px",
  border: "1px solid #e6e8eb",
};

const header: React.CSSProperties = {
  backgroundColor: "#0F6E56",
  borderRadius: "8px 8px 0 0",
  padding: "24px 32px",
};

const logo: React.CSSProperties = {
  color: "#ffffff",
  fontSize: "22px",
  fontWeight: "700",
  margin: "0",
  letterSpacing: "-0.5px",
};

const content: React.CSSProperties = {
  padding: "32px 32px 24px",
};

const hr: React.CSSProperties = {
  borderColor: "#e6e8eb",
  margin: "0 32px",
};

const footer: React.CSSProperties = {
  padding: "20px 32px 28px",
};

const footerText: React.CSSProperties = {
  color: "#8898aa",
  fontSize: "12px",
  lineHeight: "18px",
  margin: "0 0 4px",
};
