import twilio from "twilio";
import type { SupabaseClient } from "@supabase/supabase-js";

let _client: ReturnType<typeof twilio> | null = null;

function getClient() {
  if (!_client) {
    const sid = process.env.TWILIO_ACCOUNT_SID;
    const token = process.env.TWILIO_AUTH_TOKEN;
    if (!sid || !token || !sid.startsWith("AC")) {
      throw new Error("Twilio not configured");
    }
    _client = twilio(sid, token);
  }
  return _client;
}

/**
 * Low-level SMS send. Prefer `sendSMSToStudent` when you have a studentId —
 * it handles the Twilio TFV / CTIA first-message opt-out footer for you.
 */
export async function sendSMS(to: string, body: string) {
  const client = getClient();
  const message = await client.messages.create({
    body,
    from: process.env.TWILIO_PHONE_NUMBER,
    to,
  });
  return message.sid;
}

/**
 * Appended to the first SMS Keepsy ever sends to a recipient. Required by
 * Twilio Toll-Free Verification / CTIA: the first message to any recipient
 * must identify the sender, include opt-out instructions, and disclose that
 * carrier charges may apply.
 */
const FIRST_MESSAGE_FOOTER =
  "\n\n— via Keepsy (your teacher's lesson app). Reply STOP to opt out, HELP for help. Msg&data rates may apply.";

/**
 * Send an SMS to a student, automatically appending the first-message
 * opt-out footer if this is Keepsy's first SMS to that student. Stamps
 * `students.first_sms_sent_at` after a successful send so subsequent
 * messages go out without the footer.
 */
export async function sendSMSToStudent(
  supabase: SupabaseClient,
  studentId: string,
  phone: string,
  body: string
) {
  // Look up whether we've ever sent to this student before. If the lookup
  // fails we default to treating it as a first message — appending the
  // footer is defensive (extra opt-out info is never a compliance violation;
  // missing it is).
  const { data: student } = await supabase
    .from("students")
    .select("first_sms_sent_at")
    .eq("id", studentId)
    .single();

  const isFirstMessage = !student?.first_sms_sent_at;
  const finalBody = isFirstMessage ? body + FIRST_MESSAGE_FOOTER : body;

  const sid = await sendSMS(phone, finalBody);

  if (isFirstMessage) {
    await supabase
      .from("students")
      .update({ first_sms_sent_at: new Date().toISOString() })
      .eq("id", studentId);
  }

  return sid;
}
