import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

/**
 * POST /api/lessons/update
 * Updates a lesson's date, time, and/or duration.
 *
 * Body:
 *   lessonId: string
 *   scheduledAt: string   (ISO datetime, local timezone)
 *   durationMin: number
 *   scope: "this" | "future"
 *     "this"   → update only this lesson
 *     "future" → update this lesson + all future lessons in the same recurrence
 *                group (time-of-day and duration only; dates stay relative)
 */
export async function POST(request: Request) {
  try {
    const { lessonId, scheduledAt, durationMin, scope } = await request.json();
    const supabase = await createClient();

    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Fetch the lesson to check ownership and get recurrence info
    const { data: lesson, error: lessonErr } = await supabase
      .from("lessons")
      .select("*")
      .eq("id", lessonId)
      .eq("user_id", user.id)
      .single();

    if (lessonErr || !lesson) {
      return NextResponse.json({ error: "Lesson not found" }, { status: 404 });
    }

    if (scope === "future" && lesson.recurrence_group_id) {
      // Update this lesson + all future lessons in the group.
      // Only change the time-of-day and duration (preserve each lesson's own date).
      const newTime = new Date(scheduledAt);
      const newHour = newTime.getHours();
      const newMinute = newTime.getMinutes();

      // Get all future lessons in this recurrence group (including this one)
      const { data: futureLessons, error: fetchErr } = await supabase
        .from("lessons")
        .select("id, scheduled_at")
        .eq("recurrence_group_id", lesson.recurrence_group_id)
        .eq("user_id", user.id)
        .eq("status", "scheduled")
        .gte("scheduled_at", lesson.scheduled_at);

      if (fetchErr) throw fetchErr;

      for (const fl of futureLessons ?? []) {
        const d = new Date(fl.scheduled_at);
        d.setHours(newHour, newMinute, 0, 0);
        await supabase
          .from("lessons")
          .update({
            scheduled_at: d.toISOString(),
            duration_min: durationMin ?? lesson.duration_min,
          })
          .eq("id", fl.id);
      }
    } else {
      // Update just this lesson
      const { error: updateErr } = await supabase
        .from("lessons")
        .update({
          scheduled_at: new Date(scheduledAt).toISOString(),
          duration_min: durationMin ?? lesson.duration_min,
        })
        .eq("id", lessonId);

      if (updateErr) throw updateErr;
    }

    return NextResponse.json({ success: true });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Server error" },
      { status: 500 }
    );
  }
}
