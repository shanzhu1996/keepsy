import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { sendSMS } from "@/lib/sms";

export async function POST(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: lessonId } = await params;
    const supabase = await createClient();

    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { data: lesson, error: lessonErr } = await supabase
      .from("lessons")
      .select("id, student_summary, student:students(id, name, phone, contact_method)")
      .eq("id", lessonId)
      .eq("user_id", user.id)
      .single();

    if (lessonErr || !lesson) {
      return NextResponse.json({ error: "Lesson not found" }, { status: 404 });
    }

    const message = (lesson.student_summary ?? "").trim();
    if (!message) {
      return NextResponse.json({ error: "No message to send" }, { status: 400 });
    }

    const student = lesson.student as
      | { id: string; name: string; phone: string | null; contact_method: string }
      | null;
    const phone = student?.phone ?? null;

    const twilioConfigured =
      !!process.env.TWILIO_ACCOUNT_SID &&
      !!process.env.TWILIO_AUTH_TOKEN &&
      !!process.env.TWILIO_PHONE_NUMBER;

    let sentVia: "sms" | "dry-run" = "dry-run";
    if (twilioConfigured && phone) {
      await sendSMS(phone, message);
      sentVia = "sms";
    }

    const sentAt = new Date().toISOString();
    const { error: updateErr } = await supabase
      .from("lessons")
      .update({ note_status: "sent", student_summary_sent_at: sentAt })
      .eq("id", lessonId)
      .eq("user_id", user.id);
    if (updateErr) throw updateErr;

    if (student) {
      await supabase.from("message_logs").insert({
        user_id: user.id,
        student_id: student.id,
        lesson_id: lessonId,
        type: sentVia === "sms" ? "sms" : "dry-run",
        content: message,
        sent: sentVia === "sms",
        sent_at: sentVia === "sms" ? sentAt : null,
      });
    }

    return NextResponse.json({ success: true, sentVia, sentAt });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Server error" },
      { status: 500 }
    );
  }
}
