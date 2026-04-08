import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { structureLessonNotes } from "@/lib/ai";

export async function POST(request: Request) {
  try {
    const { lessonId, brainDump } = await request.json();
    if (!brainDump?.trim()) {
      return NextResponse.json({ error: "Empty input" }, { status: 400 });
    }

    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { data: lesson, error: lessonErr } = await supabase
      .from("lessons")
      .select("student:students(name)")
      .eq("id", lessonId)
      .eq("user_id", user.id)
      .single();

    if (lessonErr || !lesson) {
      return NextResponse.json({ error: "Lesson not found" }, { status: 404 });
    }

    const studentName =
      (lesson.student as { name?: string } | null)?.name ?? "the student";

    const result = await structureLessonNotes(brainDump, studentName);
    return NextResponse.json(result);
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Server error" },
      { status: 500 }
    );
  }
}
