import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { incrementLessonCountAndCheckPayment } from "@/lib/billing";

export async function POST(request: Request) {
  try {
    const { lessonId, chargeForLesson } = await request.json();
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

    if (lesson.status === "cancelled") {
      return NextResponse.json({ success: true, lesson });
    }

    const { data: updated, error: updateErr } = await supabase
      .from("lessons")
      .update({
        status: "cancelled",
        cancelled_counts_as_completed: !!chargeForLesson,
      })
      .eq("id", lessonId)
      .select()
      .single();

    if (updateErr) throw updateErr;

    // If charging, treat like a completed lesson for billing
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
      lesson: updated,
      paymentCreated: !!payment,
    });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Server error" },
      { status: 500 }
    );
  }
}
