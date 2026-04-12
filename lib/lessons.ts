import { createClient } from "@/lib/supabase/server";
import type { Lesson } from "@/lib/types";

export async function getTodayAndUpcomingLessons(): Promise<Lesson[]> {
  const supabase = await createClient();
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const { data, error } = await supabase
    .from("lessons")
    .select("*, student:students(*)")
    .gte("scheduled_at", today.toISOString())
    .order("scheduled_at", { ascending: true })
    .limit(50);

  if (error) throw error;
  return data ?? [];
}

export async function getLessonsForStudent(
  studentId: string
): Promise<Lesson[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("lessons")
    .select("*")
    .eq("student_id", studentId)
    .order("scheduled_at", { ascending: false });

  if (error) throw error;
  return data ?? [];
}

/** Returns a map of studentId → completed lesson count (for billing cycle display) */
export async function getCompletedLessonCounts(): Promise<Record<string, number>> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return {};

  const { data, error } = await supabase
    .from("lessons")
    .select("student_id")
    .eq("user_id", user.id)
    .eq("status", "completed");

  if (error) return {};

  const counts: Record<string, number> = {};
  for (const row of data ?? []) {
    counts[row.student_id] = (counts[row.student_id] ?? 0) + 1;
  }
  return counts;
}

export async function getLesson(id: string): Promise<Lesson | null> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("lessons")
    .select("*, student:students(*)")
    .eq("id", id)
    .single();

  if (error) return null;
  return data;
}

export async function createLesson(lesson: {
  student_id: string;
  scheduled_at: string;
  duration_min?: number;
  recurrence_rule?: string;
  recurrence_group_id?: string;
}) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Not authenticated");

  const { data, error } = await supabase
    .from("lessons")
    .insert({ ...lesson, user_id: user.id })
    .select()
    .single();

  if (error) throw error;
  return data;
}

export async function createManyLessons(
  lessons: Array<{
    student_id: string;
    scheduled_at: string;
    duration_min?: number;
    recurrence_rule?: string;
    recurrence_group_id?: string;
  }>
) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Not authenticated");

  const rows = lessons.map((l) => ({ ...l, user_id: user.id }));
  const { data, error } = await supabase
    .from("lessons")
    .insert(rows)
    .select();

  if (error) throw error;
  return data;
}
