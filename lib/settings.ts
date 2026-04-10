import { createClient } from "@/lib/supabase/server";

export interface TeacherProfile {
  id: string;
  user_id: string;
  name: string | null;
  email: string | null;
  default_duration_min: number;
  default_hourly_rate: number | null;
  default_cycle_lessons: number | null;
  default_cycle_price: number | null;
  timezone: string;
  created_at: string;
  updated_at: string;
}

export async function getProfile(): Promise<TeacherProfile | null> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const { data } = await supabase
    .from("teacher_profiles")
    .select("*")
    .eq("user_id", user.id)
    .single();

  return data ?? null;
}

export async function upsertProfile(
  updates: Partial<Omit<TeacherProfile, "id" | "user_id" | "created_at" | "updated_at">>
): Promise<TeacherProfile | null> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const { data, error } = await supabase
    .from("teacher_profiles")
    .upsert(
      {
        user_id: user.id,
        ...updates,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "user_id" }
    )
    .select()
    .single();

  if (error) throw error;
  return data;
}
