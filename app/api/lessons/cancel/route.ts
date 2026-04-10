import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { incrementLessonCountAndCheckPayment } from "@/lib/billing";

export async function POST(request: Request) {
  try {
    const { lessonId, chargeForLesson, scope = "this" } = await request.json();
    const supabase = await createClient();

    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

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

    // Build the list of lesson IDs to cancel
    let lessonIds: string[] = [lessonId];

    if (
      scope === "future" &&
      lesson.recurrence_group_id
    ) {
      // Cancel this lesson + all future lessons in the same recurrence group
      const { data: futureLessons } = await supabase
        .from("lessons")
        .select("id")
        .eq("user_id", user.id)
        .eq("recurrence_group_id", lesson.recurrence_group_id)
        .eq("status", "scheduled")
        .gte("scheduled_at", lesson.scheduled_at);

      if (futureLessons && futureLessons.length > 0) {
        lessonIds = futureLessons.map((l) => l.id);
      }
    }

    // Cancel all targeted lessons
    const { error: updateErr } = await supabase
      .from("lessons")
      .update({
        status: "cancelled",
        cancelled_counts_as_completed: !!chargeForLesson,
      })
      .in("id", lessonIds);

    if (updateErr) throw updateErr;

    // If charging, treat like a completed lesson for billing (only for the single lesson)
    let payment = null;
    if (chargeForLesson) {
      payment = await incrementLessonCountAndCheckPayment(
        supabase,
        lesson.student_id,
        user.id
      );
    }

    return NextResponse.json({
      success: true,
      cancelledCount: lessonIds.length,
      paymentCreated: !!payment,
    });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Server error" },
      { status: 500 }
    );
  }
}
