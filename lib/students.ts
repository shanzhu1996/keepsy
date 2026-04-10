import { createClient } from "@/lib/supabase/server";
import type { Student } from "@/lib/types";

export async function getStudents(): Promise<Student[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("students")
    .select("*")
    .eq("is_active", true)
    .order("display_order", { ascending: true })
    .order("name");

  if (error) throw error;
  return data ?? [];
}

export async function getStudent(id: string): Promise<Student | null> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("students")
    .select("*")
    .eq("id", id)
    .single();

  if (error) return null;
  return data;
}

export async function createStudent(
  student: Omit<Student, "id" | "user_id" | "lessons_since_last_payment" | "created_at">
) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Not authenticated");

  const { data, error } = await supabase
    .from("students")
    .insert({ ...student, user_id: user.id })
    .select()
    .single();

  if (error) throw error;
  return data;
}

export async function updateStudent(
  id: string,
  updates: Partial<Student>
) {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("students")
    .update(updates)
    .eq("id", id)
    .select()
    .single();

  if (error) throw error;
  return data;
}
