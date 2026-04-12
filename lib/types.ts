export type LessonStatus = "scheduled" | "completed" | "cancelled";
export type NoteStatus = "not_started" | "draft" | "sent";

export interface LessonReport {
  covered: string[];
  teacher_notes: string[];
  assignments: string[];
  next_lesson_plan: string[];
  materials: string[];
}

export interface GeneratedNote {
  student_message: string;
  lesson_report: LessonReport;
}
export type PaymentStatus = "pending" | "paid";
export type ContactMethod = "email" | "phone" | "sms";

export interface Student {
  id: string;
  user_id: string;
  name: string;
  email: string | null;
  phone: string | null;
  contact_method: ContactMethod;
  lesson_default_duration_min: number | null;
  billing_enabled: boolean;
  auto_remind: boolean;
  billing_cycle_lessons: number | null;
  cycle_price: number | null;
  lessons_since_last_payment: number;
  cycle_lessons_offset: number;
  is_active: boolean;
  notes: string | null;
  progress_summary: string | null;
  progress_summary_updated_at: string | null;
  display_order: number;
  created_at: string;
}

export interface Lesson {
  id: string;
  user_id: string;
  student_id: string;
  scheduled_at: string;
  duration_min: number | null;
  status: LessonStatus;
  cancelled_counts_as_completed: boolean;
  raw_note: string | null;
  internal_summary: string | null;
  student_summary: string | null;
  note_status?: NoteStatus | null;
  student_summary_sent_at?: string | null;
  recurrence_rule: string | null;
  recurrence_group_id: string | null;
  completed_at: string | null;
  reminder_sent_at: string | null;
  created_at: string;
  // Joined fields
  student?: Student;
}

export interface Payment {
  id: string;
  user_id: string;
  student_id: string;
  amount: number;
  status: PaymentStatus;
  lesson_count_covered: number;
  due_triggered_at: string;
  paid_at: string | null;
  message_draft: string | null;
  created_at: string;
  // Joined fields
  student?: Student;
}

export interface MessageLog {
  id: string;
  user_id: string;
  student_id: string;
  lesson_id: string | null;
  payment_id: string | null;
  type: string;
  content: string;
  sent: boolean;
  sent_at: string | null;
  created_at: string;
}
