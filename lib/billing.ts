import { SupabaseClient } from "@supabase/supabase-js";

/**
 * After a lesson is completed (or cancelled with charge),
 * atomically increment the student's lesson counter and check if
 * a payment should be triggered.
 */
export async function incrementLessonCountAndCheckPayment(
  supabase: SupabaseClient,
  studentId: string,
  userId: string
) {
  // Get the student
  const { data: student, error: studentErr } = await supabase
    .from("students")
    .select("*")
    .eq("id", studentId)
    .single();

  if (studentErr || !student) throw new Error("Student not found");
  if (!student.billing_enabled) return null;

  // Atomic increment — avoids race condition from read-increment-write pattern
  const { data: updated, error: incrementErr } = await supabase.rpc(
    "increment_lesson_counter",
    { student_id_input: studentId }
  ).single();

  // Fallback: if RPC doesn't exist yet, use non-atomic increment
  let newCount: number;
  if (incrementErr || !updated) {
    newCount = student.lessons_since_last_payment + 1;
    await supabase
      .from("students")
      .update({ lessons_since_last_payment: newCount })
      .eq("id", studentId);
  } else {
    newCount = (updated as { lessons_since_last_payment: number }).lessons_since_last_payment;
  }

  // Check if threshold reached
  if (
    student.billing_cycle_lessons &&
    newCount >= student.billing_cycle_lessons
  ) {
    // Don't create a duplicate if one already exists
    const { data: existing } = await supabase
      .from("payments")
      .select("id")
      .eq("student_id", studentId)
      .eq("status", "pending")
      .limit(1);

    if (existing?.length) return null;

    // Create a pending payment
    const { data: payment, error: paymentErr } = await supabase
      .from("payments")
      .insert({
        user_id: userId,
        student_id: studentId,
        amount: student.cycle_price ?? 0,
        status: "pending",
        lesson_count_covered: student.billing_cycle_lessons,
        due_triggered_at: new Date().toISOString(),
      })
      .select()
      .single();

    if (paymentErr) throw paymentErr;
    return payment;
  }

  return null;
}
