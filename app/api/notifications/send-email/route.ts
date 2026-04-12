import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { sendEmail } from "@/lib/email";

export async function POST(request: Request) {
  try {
    const { studentEmail, studentId, message, subject } = await request.json();
    const supabase = await createClient();

    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    if (!studentEmail) {
      return NextResponse.json(
        { error: "No email address provided" },
        { status: 400 }
      );
    }

    if (!process.env.RESEND_API_KEY) {
      return NextResponse.json(
        { error: "Email service not configured" },
        { status: 400 }
      );
    }

    const emailId = await sendEmail(
      studentEmail,
      subject || "Message from your teacher",
      message
    );

    // Log the message
    await supabase.from("message_logs").insert({
      user_id: user.id,
      student_id: studentId || "unknown",
      type: "email",
      content: message,
      sent: true,
      sent_at: new Date().toISOString(),
    });

    return NextResponse.json({ success: true, emailId });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Server error" },
      { status: 500 }
    );
  }
}
