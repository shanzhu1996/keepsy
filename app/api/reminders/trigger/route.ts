import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { sendLessonRemindersForUser } from "@/lib/notifications";

/**
 * POST /api/reminders/trigger
 * Manually triggers reminders for the logged-in user's upcoming lessons.
 * Accepts optional hoursBeforeLesson in request body (default 24).
 */
export async function POST(request: Request) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json().catch(() => ({}));
    const hoursBeforeLesson = Number(body.hoursBeforeLesson) || 24;
    const studentId: string | undefined = body.studentId;

    const result = await sendLessonRemindersForUser(user.id, hoursBeforeLesson, studentId);
    return NextResponse.json(result);
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Server error" },
      { status: 500 }
    );
  }
}
