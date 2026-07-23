import { Resend } from "resend";
import type { ReactElement } from "react";

function getResend() {
  return new Resend(process.env.RESEND_API_KEY!);
}

export async function sendEmail({
  to,
  subject,
  react,
  html,
  text,
}: {
  to: string | string[];
  subject: string;
  react?: ReactElement;
  html?: string;
  text?: string;
}) {
  const body = react ? { react } : html ? { html } : { text: text ?? "" };
  const { data, error } = await getResend().emails.send({
    from: process.env.RESEND_FROM_EMAIL!,
    to,
    subject,
    ...body,
  });

  if (error) {
    console.error("[Resend] Failed to send email:", error);
    throw new Error(error.message);
  }

  return data;
}
