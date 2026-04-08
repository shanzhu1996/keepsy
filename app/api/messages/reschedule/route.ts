import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { generateRescheduleMessage } from "@/lib/ai";

export async function POST(request: Request) {
  try {
    const { lessonId, reason } = await request.json();
    const supabase = await createClient();

    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { data: lesson, error } = await supabase
      .from("lessons")
      .select("*, student:students(name)")
      .eq("id", lessonId)
      .eq("user_id", user.id)
      .single();

    if (error || !lesson) {
      return NextResponse.json(
        { error: "Lesson not found" },
        { status: 404 }
      );
    }

    const message = await generateRescheduleMessage(
      lesson.student?.name ?? "Student",
      lesson.scheduled_at,
      reason
    );

    return NextResponse.json({ message });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Server error" },
      { status: 500 }
    );
  }
}
