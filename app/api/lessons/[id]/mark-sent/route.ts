import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

// Mark a lesson note as sent after the teacher copies/pastes it manually.
// No SMS side effects.
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

    const { data: lesson } = await supabase
      .from("lessons")
      .select("id, student_summary, student:students(id)")
      .eq("id", lessonId)
      .eq("user_id", user.id)
      .single();

    if (!lesson) {
      return NextResponse.json({ error: "Lesson not found" }, { status: 404 });
    }

    const sentAt = new Date().toISOString();
    const { error: updateErr } = await supabase
      .from("lessons")
      .update({ note_status: "sent", student_summary_sent_at: sentAt })
      .eq("id", lessonId)
      .eq("user_id", user.id);
    if (updateErr) throw updateErr;

    const student = (lesson.student as unknown) as { id: string } | null;
    if (student) {
      await supabase.from("message_logs").insert({
        user_id: user.id,
        student_id: student.id,
        lesson_id: lessonId,
        type: "manual-copy",
        content: (lesson.student_summary ?? "").trim(),
        sent: true,
        sent_at: sentAt,
      });
    }

    return NextResponse.json({ success: true, sentAt });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Server error" },
      { status: 500 }
    );
  }
}
