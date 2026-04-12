import { createClient } from "@/lib/supabase/server";
import type { Payment } from "@/lib/types";

export interface ActiveCycle {
  studentId: string;
  studentName: string;
  studentPhone: string | null;
  studentEmail: string | null;
  cycleLength: number;
  /** Lessons taken in the current (unpaid) cycle. 0 = due but not started yet. */
  lessonsInUnpaidCycle: number;
  status: "due" | "overdue";
  amountDue: number;
  /** For overdue: first and last unpaid lesson dates */
  cycleStartDate: string | null;
  cycleEndDate: string | null;
  /** For due: dates of the last completed (paid) cycle */
  lastCycleStartDate: string | null;
  lastCycleEndDate: string | null;
  /** Next scheduled lesson for this student */
  nextLessonDate: string | null;
  /** Last time a payment reminder was sent */
  lastRemindedAt: string | null;
  /** New student with 0 lessons and 0 payments */
  isNewStudent: boolean;
}

/**
 * Prepaid billing model: students pay BEFORE their cycle of lessons.
 *
 * Returns billing-enabled students who need to pay:
 * - "due": previous paid cycle ended (or new student with 0 payments).
 *          Next payment expected before more lessons happen.
 * - "overdue": lessons are happening without payment for the current cycle.
 *
 * Students mid-cycle with payment in good standing are NOT returned.
 */
export async function getActiveCycles(): Promise<ActiveCycle[]> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return [];

  const { data: students } = await supabase
    .from("students")
    .select("id, name, phone, email, billing_cycle_lessons, cycle_price")
    .eq("user_id", user.id)
    .eq("billing_enabled", true)
    .eq("is_active", true)
    .not("billing_cycle_lessons", "is", null);

  if (!students?.length) return [];

  const ids = students.map((s) => s.id);

  const [{ data: lessons }, { data: paidPayments }, { data: scheduledLessons }, { data: reminderLogs }] = await Promise.all([
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
    supabase
      .from("lessons")
      .select("student_id, scheduled_at")
      .in("student_id", ids)
      .eq("status", "scheduled")
      .gte("scheduled_at", new Date().toISOString())
      .order("scheduled_at", { ascending: true }),
    supabase
      .from("message_logs")
      .select("student_id, sent_at")
      .in("student_id", ids)
      .eq("sent", true)
      .order("sent_at", { ascending: false }),
  ]);

  const result: ActiveCycle[] = [];

  for (const student of students) {
    const cycleLength = student.billing_cycle_lessons as number;
    const studentLessons = (lessons ?? []).filter((l) => l.student_id === student.id);
    const studentPayments = (paidPayments ?? []).filter((p) => p.student_id === student.id);

    const paidCycles = studentPayments.length;
    const totalCompleted = studentLessons.length;

    // How many lessons are "covered" by payments
    const lessonsCovered = paidCycles * cycleLength;

    // Lessons taken beyond what's been paid for
    const unpaidLessons = Math.max(0, totalCompleted - lessonsCovered);

    // New student with no payments and no lessons → "due" (pay before starting)
    const isNewStudent = paidCycles === 0 && totalCompleted === 0;

    // Previous cycle ended: student has used all paid lessons, or new student
    // due = paid lessons are exhausted (totalCompleted >= lessonsCovered) and no extra lessons taken yet
    const paidCycleEnded = paidCycles > 0 && totalCompleted >= lessonsCovered && unpaidLessons === 0;

    // Overdue: lessons happening beyond what's paid for
    const isOverdue = unpaidLessons > 0;

    // Due: cycle ended or new student, but no unpaid lessons yet
    const isDue = isNewStudent || paidCycleEnded;

    if (!isDue && !isOverdue) continue;

    const status: "due" | "overdue" = isOverdue ? "overdue" : "due";

    // For overdue: show unpaid lessons range
    let cycleStartDate: string | null = null;
    let cycleEndDate: string | null = null;
    // For due: show last completed cycle dates
    let lastCycleStartDate: string | null = null;
    let lastCycleEndDate: string | null = null;

    if (isOverdue) {
      cycleStartDate = studentLessons[lessonsCovered]?.scheduled_at ?? null;
      cycleEndDate = studentLessons[totalCompleted - 1]?.scheduled_at ?? null;
    }

    // Last paid cycle date range (for "due" context)
    if (paidCycles > 0 && totalCompleted >= cycleLength) {
      const lastCycleStart = (paidCycles - 1) * cycleLength;
      const lastCycleEnd = lastCycleStart + cycleLength - 1;
      lastCycleStartDate = studentLessons[lastCycleStart]?.scheduled_at ?? null;
      lastCycleEndDate = studentLessons[lastCycleEnd]?.scheduled_at ?? null;
    }

    // Next scheduled lesson for this student
    const nextLesson = (scheduledLessons ?? []).find((l) => l.student_id === student.id);
    // Last reminder sent
    const lastReminder = (reminderLogs ?? []).find((l) => l.student_id === student.id);

    result.push({
      studentId: student.id,
      studentName: student.name,
      studentPhone: student.phone,
      studentEmail: student.email ?? null,
      cycleLength,
      lessonsInUnpaidCycle: unpaidLessons,
      status,
      amountDue: student.cycle_price ?? 0,
      cycleStartDate,
      cycleEndDate,
      lastCycleStartDate,
      lastCycleEndDate,
      nextLessonDate: nextLesson?.scheduled_at ?? null,
      lastRemindedAt: lastReminder?.sent_at ?? null,
      isNewStudent,
    });
  }

  // Sort: overdue first, then due
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

export interface MonthlySummary {
  month: string; // "YYYY-MM"
  label: string; // "April 2026"
  total: number;
}

/** Returns monthly income totals for the last 12 months, most recent first. */
export async function getMonthlyIncomeSummary(): Promise<MonthlySummary[]> {
  const supabase = await createClient();
  const now = new Date();
  const twelveMonthsAgo = new Date(now.getFullYear(), now.getMonth() - 11, 1);

  const { data, error } = await supabase
    .from("payments")
    .select("amount, paid_at")
    .eq("status", "paid")
    .gte("paid_at", twelveMonthsAgo.toISOString())
    .order("paid_at", { ascending: false });

  if (error) throw error;

  const byMonth = new Map<string, number>();

  for (const p of data ?? []) {
    const d = new Date(p.paid_at);
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
    byMonth.set(key, (byMonth.get(key) ?? 0) + parseFloat(String(p.amount)));
  }

  // Build list for last 12 months (include months with $0)
  const result: MonthlySummary[] = [];
  for (let i = 0; i < 12; i++) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
    const label = d.toLocaleDateString(undefined, { month: "long", year: "numeric" });
    result.push({ month: key, label, total: byMonth.get(key) ?? 0 });
  }

  return result;
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
