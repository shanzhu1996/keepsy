import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { generateLessonSummaries } from "@/lib/ai";

export async function POST(request: Request) {
  try {
    const { lessonId, rawNote } = await request.json();
    const supabase = await createClient();

    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Get the lesson + student name
    const { data: lesson, error: lessonErr } = await supabase
      .from("lessons")
      .select("*, student:students(name)")
      .eq("id", lessonId)
      .eq("user_id", user.id)
      .single();

    if (lessonErr || !lesson) {
      return NextResponse.json(
        { error: "Lesson not found" },
        { status: 404 }
      );
    }

    const studentName = lesson.student?.name ?? "the student";

    const { studentSummary } = await generateLessonSummaries(rawNote, studentName);

    await supabase
      .from("lessons")
      .update({ raw_note: rawNote, student_summary: studentSummary })
      .eq("id", lessonId);

    return NextResponse.json({ studentSummary });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Server error" },
      { status: 500 }
    );
  }
}
