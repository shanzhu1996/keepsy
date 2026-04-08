import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import type { LessonReport } from "@/lib/types";

// Autosave partial edits to the generated note from the Result screen.
// Body: { student_message?, lesson_report? (partial) }
export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: lessonId } = await params;
    const body = (await request.json()) as {
      student_message?: string;
      lesson_report?: Partial<LessonReport>;
    };

    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { data: lesson, error: lessonErr } = await supabase
      .from("lessons")
      .select("id, raw_note, student_summary")
      .eq("id", lessonId)
      .eq("user_id", user.id)
      .single();

    if (lessonErr || !lesson) {
      return NextResponse.json({ error: "Lesson not found" }, { status: 404 });
    }

    let parsed: { transcript?: string; lesson_report?: LessonReport } = {};
    if (lesson.raw_note) {
      try {
        parsed = JSON.parse(lesson.raw_note);
      } catch {
        parsed = { transcript: lesson.raw_note };
      }
    }

    const emptyReport: LessonReport = {
      covered: [],
      teacher_notes: [],
      assignments: [],
      next_lesson_plan: [],
      materials: [],
    };
    const existingReport: LessonReport = {
      ...emptyReport,
      ...(parsed.lesson_report ?? {}),
    };
    const nextReport: LessonReport = {
      ...existingReport,
      ...(body.lesson_report ?? {}),
    };

    const nextRaw = {
      transcript: parsed.transcript ?? "",
      lesson_report: nextReport,
    };

    const updates: Record<string, unknown> = {
      raw_note: JSON.stringify(nextRaw),
      note_status: "draft",
    };
    if (typeof body.student_message === "string") {
      updates.student_summary = body.student_message;
    }

    const { error: updateErr } = await supabase
      .from("lessons")
      .update(updates)
      .eq("id", lessonId)
      .eq("user_id", user.id);
    if (updateErr) throw updateErr;

    return NextResponse.json({ success: true });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Server error" },
      { status: 500 }
    );
  }
}
