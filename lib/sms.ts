import twilio from "twilio";

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

export async function sendSMS(to: string, body: string) {
  const client = getClient();
  const message = await client.messages.create({
    body,
    from: process.env.TWILIO_PHONE_NUMBER,
    to,
  });
  return message.sid;
}
