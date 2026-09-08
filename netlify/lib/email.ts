import { Resend } from "resend";
import { render } from "@react-email/render";
import type { ReactElement } from "react";

const FROM = "TopoJoy <noreply@topojoy.studio>";

let _resend: Resend | null = null;
export function getResend(): Resend {
  if (!_resend) {
    const key = process.env.RESEND_API_KEY;
    if (!key) throw new Error("RESEND_API_KEY env var is not set");
    _resend = new Resend(key);
  }
  return _resend;
}

export async function sendEmail({
  to,
  subject,
  template,
}: {
  to: string;
  subject: string;
  template: ReactElement;
}): Promise<void> {
  if (!to) {
    console.warn(
      `[email] Skipping send — no recipient address. Subject: "${subject}"`,
    );
    return;
  }

  const html = await render(template);

  const { error } = await getResend().emails.send({
    from: FROM,
    to,
    subject,
    html,
  });

  if (error) {
    console.error(`[email] Failed to send "${subject}" to ${to}:`, error);
    throw new Error(`Email send failed: ${error.message}`);
  }

  console.log(`[email] Sent "${subject}" to ${to}`);
}
