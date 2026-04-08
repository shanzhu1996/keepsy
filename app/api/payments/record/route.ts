import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function POST(request: Request) {
  try {
    const { studentId, amount, lessonCount } = await request.json();
    const supabase = await createClient();

    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Verify the student belongs to this user
    const { data: student, error: studentErr } = await supabase
      .from("students")
      .select("id")
      .eq("id", studentId)
      .eq("user_id", user.id)
      .single();

    if (studentErr || !student) {
      return NextResponse.json({ error: "Student not found" }, { status: 404 });
    }

    const { error: insertErr } = await supabase.from("payments").insert({
      user_id: user.id,
      student_id: studentId,
      amount: parseFloat(amount),
      status: "paid",
      lesson_count_covered: lessonCount ? parseInt(lessonCount) : 0,
      due_triggered_at: new Date().toISOString(),
      paid_at: new Date().toISOString(),
    });

    if (insertErr) throw insertErr;

    // Reset the lesson counter so the next cycle starts fresh
    await supabase
      .from("students")
      .update({ lessons_since_last_payment: 0 })
      .eq("id", studentId)
      .eq("user_id", user.id);

    return NextResponse.json({ success: true });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Server error" },
      { status: 500 }
    );
  }
}
