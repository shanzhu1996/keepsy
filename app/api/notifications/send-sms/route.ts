import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { sendSMS, sendSMSToStudent } from "@/lib/sms";

export async function POST(request: Request) {
  try {
    const { studentPhone, studentId, message } = await request.json();
    const supabase = await createClient();

    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    if (!studentPhone) {
      return NextResponse.json(
        { error: "No phone number provided" },
        { status: 400 }
      );
    }

    // Check if Twilio is configured
    if (
      !process.env.TWILIO_ACCOUNT_SID ||
      !process.env.TWILIO_AUTH_TOKEN ||
      !process.env.TWILIO_PHONE_NUMBER
    ) {
      return NextResponse.json(
        { error: "Twilio not configured" },
        { status: 400 }
      );
    }

    // Send SMS — route through sendSMSToStudent when we have the studentId
    // so the first-message opt-out footer is appended automatically. Rare
    // edge case: if no studentId is provided, fall back to raw sendSMS.
    const messageSid = studentId
      ? await sendSMSToStudent(supabase, studentId, studentPhone, message)
      : await sendSMS(studentPhone, message);

    // Log the message
    await supabase.from("message_logs").insert({
      user_id: user.id,
      student_id: studentId || "unknown",
      type: "sms",
      content: message,
      sent: true,
      sent_at: new Date().toISOString(),
    });

    return NextResponse.json({ success: true, messageSid });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Server error" },
      { status: 500 }
    );
  }
}
