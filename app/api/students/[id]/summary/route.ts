import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { generateProgressSummary } from "@/lib/ai";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: studentId } = await params;
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Get student name
    const { data: student } = await supabase
      .from("students")
      .select("name")
      .eq("id", studentId)
      .eq("user_id", user.id)
      .single();

    if (!student) {
      return NextResponse.json({ error: "Student not found" }, { status: 404 });
    }

    // Get all completed lessons with notes
    const { data: lessons } = await supabase
      .from("lessons")
      .select("raw_note, scheduled_at")
      .eq("student_id", studentId)
      .eq("user_id", user.id)
      .eq("status", "completed")
      .not("raw_note", "is", null)
      .order("scheduled_at", { ascending: true });

    if (!lessons || lessons.length < 3) {
      return NextResponse.json({ summary: null, reason: "not_enough_lessons" });
    }

    // Extract structured notes from each lesson (handles both JSON and plain text formats)
    const toArr = (x: unknown): string[] =>
      Array.isArray(x) ? x.filter((v): v is string => typeof v === "string" && v.trim().length > 0) : [];

    const lessonNotes = lessons
      .map((l) => {
        const date = new Date(l.scheduled_at).toLocaleDateString([], { month: "short", day: "numeric" });
        const rawNote = l.raw_note as string;

        // Try JSON format first (structured lesson_report)
        try {
          const parsed = JSON.parse(rawNote);
          if (parsed.lesson_report) {
            const report = parsed.lesson_report;
            return {
              date,
              covered: toArr(report.covered),
              teacherNotes: toArr(report.teacher_notes),
              assignments: toArr(report.assignments),
              nextPlan: toArr(report.next_lesson_plan),
            };
          }
        } catch {
          // Not JSON — fall through to plain text handling
        }

        // Plain text / markdown notes — treat the whole text as teacher notes
        const text = rawNote.trim();
        if (text.length > 0) {
          return {
            date,
            covered: [] as string[],
            teacherNotes: [text],
            assignments: [] as string[],
            nextPlan: [] as string[],
          };
        }

        return null;
      })
      .filter((n): n is NonNullable<typeof n> => n !== null);

    // Check quality threshold — at least 3 lessons with any content
    if (lessonNotes.length < 3) {
      return NextResponse.json({ summary: null, reason: "not_enough_content" });
    }

    const summary = await generateProgressSummary(lessonNotes, student.name);

    // Save to student record
    const { error: updateErr } = await supabase
      .from("students")
      .update({
        progress_summary: summary,
        progress_summary_updated_at: new Date().toISOString(),
      })
      .eq("id", studentId)
      .eq("user_id", user.id);

    if (updateErr) throw updateErr;

    return NextResponse.json({ summary });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Server error" },
      { status: 500 }
    );
  }
}
