import { error, success } from "../lib";
import { getResend } from "../lib/email";

const FORWARD_TO = "ian.campbell.92@gmail.com";
const DEFAULT_FROM = "hello@topojoy.studio";

export const handler = async (event: any) => {
  if (event.httpMethod !== "POST") {
    return error("Method not allowed", 405);
  }

  const payload = JSON.parse(event.body || "{}");

  if (payload.type !== "email.received" || !payload.data?.email_id) {
    return success({ ok: true });
  }

  const receivedFor = Array.isArray(payload.data.to)
    ? payload.data.to[0]
    : undefined;

  const resend = getResend();

  const { data, error: forwardError } = await resend.emails.receiving.forward({
    emailId: payload.data.email_id,
    to: FORWARD_TO,
    from: receivedFor || DEFAULT_FROM,
  });

  if (forwardError) {
    console.error("[email-inbound] Forward failed:", forwardError);
    return error(forwardError.message, 500);
  }

  return success({ ok: true, id: data?.id });
};
