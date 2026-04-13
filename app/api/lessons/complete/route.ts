import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { incrementLessonCountAndCheckPayment } from "@/lib/billing";

export async function POST(request: Request) {
  try {
    const { lessonId } = await request.json();
    const supabase = await createClient();

    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Get the lesson
    const { data: lesson, error: lessonErr } = await supabase
      .from("lessons")
      .select("*")
      .eq("id", lessonId)
      .eq("user_id", user.id)
      .single();

    if (lessonErr || !lesson) {
      return NextResponse.json(
        { error: "Lesson not found" },
        { status: 404 }
      );
    }

    // Idempotent: already completed
    if (lesson.status === "completed") {
      return NextResponse.json({ success: true, lesson });
    }

    // Update lesson status
    const { data: updated, error: updateErr } = await supabase
      .from("lessons")
      .update({
        status: "completed",
        completed_at: new Date().toISOString(),
      })
      .eq("id", lessonId)
      .select()
      .single();

    if (updateErr) throw updateErr;

    // Handle billing
    const payment = await incrementLessonCountAndCheckPayment(
      supabase,
      lesson.student_id,
      user.id
    );

    // Check if this completes a package and no future lessons exist
    let packageComplete = false;
    let hasFutureLessons = false;
    let studentName = "";

    if (lesson.student_id) {
      const { data: student } = await supabase
        .from("students")
        .select("name, billing_enabled, billing_cycle_lessons")
        .eq("id", lesson.student_id)
        .single();

      studentName = student?.name ?? "";

      if (student?.billing_enabled && student?.billing_cycle_lessons) {
        // Count completed lessons for this student
        const { count } = await supabase
          .from("lessons")
          .select("id", { count: "exact", head: true })
          .eq("student_id", lesson.student_id)
          .eq("status", "completed");

        const totalCompleted = count ?? 0;
        packageComplete = totalCompleted > 0 && totalCompleted % student.billing_cycle_lessons === 0;
      }

      // Check for future scheduled lessons
      const { data: future } = await supabase
        .from("lessons")
        .select("id")
        .eq("student_id", lesson.student_id)
        .eq("status", "scheduled")
        .gt("scheduled_at", new Date().toISOString())
        .limit(1);

      hasFutureLessons = (future?.length ?? 0) > 0;
    }

    return NextResponse.json({
      success: true,
      lesson: updated,
      paymentCreated: !!payment,
      packageComplete,
      hasFutureLessons,
      studentName,
      studentId: lesson.student_id,
    });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Server error" },
      { status: 500 }
    );
  }
}
