import { createClient } from "@/lib/supabase/server";
import type { Payment } from "@/lib/types";

export interface ActiveCycle {
  studentId: string;
  studentName: string;
  studentPhone: string | null;
  cycleLength: number;
  lessonsCompleted: number;
  isComplete: boolean;
  status: "overdue" | "pending"; // overdue = started but not paid; pending = not started, not paid
  amountDue: number;
  cycleStartDate: string | null;
  cycleEndDate: string | null;
}

/**
 * Returns every billing-enabled student who has started a new cycle
 * (at least 1 completed lesson) with no corresponding payment recorded yet.
 * This is the source of truth for the Pending tab — no DB sync needed.
 */
export async function getActiveCycles(): Promise<ActiveCycle[]> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return [];

  const { data: students } = await supabase
    .from("students")
    .select("id, name, phone, billing_cycle_lessons, cycle_price")
    .eq("user_id", user.id)
    .eq("billing_enabled", true)
    .eq("is_active", true)
    .not("billing_cycle_lessons", "is", null);

  if (!students?.length) return [];

  const ids = students.map((s) => s.id);

  const [{ data: lessons }, { data: paidPayments }] = await Promise.all([
    supabase
      .from("lessons")
      .select("student_id, scheduled_at")
      .in("student_id", ids)
      .eq("status", "completed")
      .order("scheduled_at", { ascending: true }),
    supabase
      .from("payments")
      .select("student_id, lesson_count_covered")
      .in("student_id", ids)
      .eq("status", "paid"),
  ]);

  const result: ActiveCycle[] = [];

  for (const student of students) {
    const cycleLength = student.billing_cycle_lessons as number;
    const studentLessons = (lessons ?? []).filter((l) => l.student_id === student.id);
    const studentPayments = (paidPayments ?? []).filter((p) => p.student_id === student.id);

    const paidCount = studentPayments.length;
    const totalCompleted = studentLessons.length;
    const completedCycles = Math.floor(totalCompleted / cycleLength);
    const currentCycleProgress = totalCompleted % cycleLength;
    const unpaidCompleteCycles = Math.max(0, completedCycles - paidCount);
    const hasCurrentCyclePaid = paidCount > completedCycles;

    const isOverdue =
      unpaidCompleteCycles > 0 || (currentCycleProgress > 0 && !hasCurrentCyclePaid);

    // Up to date and no progress → skip
    if (!isOverdue && currentCycleProgress === 0 && paidCount === 0) continue;
    // Paid and no new cycle progress → skip
    if (!isOverdue && paidCount > 0 && currentCycleProgress === 0) continue;

    const status: "overdue" | "pending" = isOverdue ? "overdue" : "pending";

    let lessonsCompleted: number;
    let isComplete: boolean;
    let cycleStartDate: string | null;
    let cycleEndDate: string | null;

    if (unpaidCompleteCycles > 0) {
      const startIdx = paidCount * cycleLength;
      lessonsCompleted = cycleLength;
      isComplete = true;
      cycleStartDate = studentLessons[startIdx]?.scheduled_at ?? null;
      cycleEndDate = studentLessons[startIdx + cycleLength - 1]?.scheduled_at ?? null;
    } else {
      const startIdx = completedCycles * cycleLength;
      lessonsCompleted = currentCycleProgress;
      isComplete = false;
      cycleStartDate = currentCycleProgress > 0 ? studentLessons[startIdx]?.scheduled_at ?? null : null;
      cycleEndDate = null;
    }

    result.push({
      studentId: student.id,
      studentName: student.name,
      studentPhone: student.phone,
      cycleLength,
      lessonsCompleted,
      isComplete,
      status,
      amountDue: unpaidCompleteCycles > 0 ? (student.cycle_price ?? 0) : 0,
      cycleStartDate,
      cycleEndDate,
    });
  }

  // Sort: overdue first, then pending
  result.sort((a, b) => (a.status === b.status ? 0 : a.status === "overdue" ? -1 : 1));

  return result;
}



export async function getPendingPayments(): Promise<Payment[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("payments")
    .select("*, student:students(*)")
    .eq("status", "pending")
    .order("due_triggered_at", { ascending: false });

  if (error) throw error;
  return data ?? [];
}

export async function getPaidPayments(): Promise<Payment[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("payments")
    .select("*, student:students(*)")
    .eq("status", "paid")
    .order("paid_at", { ascending: false })
    .limit(50);

  if (error) throw error;
  return data ?? [];
}

export async function getPaymentsForStudent(
  studentId: string
): Promise<Payment[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("payments")
    .select("*")
    .eq("student_id", studentId)
    .order("created_at", { ascending: false });

  if (error) throw error;
  return data ?? [];
}

export async function getMonthlyIncome(): Promise<number> {
  const supabase = await createClient();
  const now = new Date();
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
  const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59);

  const { data, error } = await supabase
    .from("payments")
    .select("amount")
    .eq("status", "paid")
    .gte("paid_at", startOfMonth.toISOString())
    .lte("paid_at", endOfMonth.toISOString());

  if (error) throw error;
  return (data ?? []).reduce(
    (sum, p) => sum + parseFloat(String(p.amount)),
    0
  );
}
