import { createClient } from "@/lib/supabase/server";
import type { MessageLog } from "@/lib/types";

export async function getMessagesForStudent(studentId: string): Promise<MessageLog[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("message_logs")
    .select("*")
    .eq("student_id", studentId)
    .order("created_at", { ascending: false });

  if (error) throw error;
  return data ?? [];
}
