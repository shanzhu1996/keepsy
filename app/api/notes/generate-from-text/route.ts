import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { generateFromTranscript } from "@/lib/ai";

export async function POST(request: Request) {
  try {
    const { lessonId, transcript, language } = await request.json();
    if (!lessonId || typeof transcript !== "string" || !transcript.trim()) {
      return NextResponse.json({ error: "Missing lessonId or transcript" }, { status: 400 });
    }
    const languageName = typeof language === "string" && language ? language : "English";

    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { data: lesson, error: lessonErr } = await supabase
      .from("lessons")
      .select("id, status, student:students(name)")
      .eq("id", lessonId)
      .eq("user_id", user.id)
      .single();

    if (lessonErr || !lesson) {
      return NextResponse.json({ error: "Lesson not found" }, { status: 404 });
    }

    const studentName =
      (lesson.student as { name?: string } | null)?.name ?? "the student";

    const note = await generateFromTranscript(transcript, studentName, languageName);

    // Persist: raw_note stores transcript+generated as JSON; student_summary is the outgoing message.
    const rawNoteJson = JSON.stringify({
      transcript,
      lesson_report: note.lesson_report,
    });

    const updates: Record<string, unknown> = {
      raw_note: rawNoteJson,
      student_summary: note.student_message,
      note_status: "draft",
    };
    // Auto-complete the lesson if it was still scheduled.
    if (lesson.status === "scheduled") {
      updates.status = "completed";
      updates.completed_at = new Date().toISOString();
    }

    const { error: updateErr } = await supabase
      .from("lessons")
      .update(updates)
      .eq("id", lessonId)
      .eq("user_id", user.id);

    if (updateErr) throw updateErr;

    // Fire-and-forget: regenerate student progress summary in the background
    const { data: lessonData } = await supabase
      .from("lessons")
      .select("student_id")
      .eq("id", lessonId)
      .single();
    if (lessonData?.student_id) {
      const origin = new URL(request.url).origin;
      fetch(`${origin}/api/students/${lessonData.student_id}/summary`, {
        method: "POST",
        headers: {
          cookie: request.headers.get("cookie") ?? "",
        },
      }).catch(() => {});
    }

    return NextResponse.json({ note });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Server error" },
      { status: 500 }
    );
  }
}
