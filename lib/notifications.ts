import { createServiceClient } from "@/lib/supabase/service";
import { sendSMS } from "@/lib/sms";

/**
 * Find upcoming lessons within `hoursBeforeLesson` hours and send SMS reminders
 * to students with auto_remind enabled and a phone number.
 * Uses service-role client so it works in cron jobs (no user session needed).
 */
export async function sendLessonReminders(hoursBeforeLesson = 24) {
  const supabase = createServiceClient();

  const now = new Date();
  const windowEnd = new Date(now.getTime() + hoursBeforeLesson * 60 * 60 * 1000);

  // Find all scheduled lessons inside the reminder window that haven't been reminded yet
  const { data: lessons, error } = await supabase
    .from("lessons")
    .select("*, student:students(*)")
    .eq("status", "scheduled")
    .is("reminder_sent_at", null)
    .gte("scheduled_at", now.toISOString())
    .lte("scheduled_at", windowEnd.toISOString());

  if (error) throw error;
  if (!lessons?.length) return { sent: 0 };

  const isTwilioConfigured =
    process.env.TWILIO_ACCOUNT_SID &&
    process.env.TWILIO_AUTH_TOKEN &&
    process.env.TWILIO_PHONE_NUMBER;

  let sent = 0;

  for (const lesson of lessons) {
    const student = lesson.student;
    if (!student?.phone || !student.auto_remind) continue;

    const time = new Date(lesson.scheduled_at).toLocaleTimeString([], {
      hour: "numeric",
      minute: "2-digit",
    });
    const dayStr = new Date(lesson.scheduled_at).toLocaleDateString([], {
      weekday: "long",
    });

    const message = `Hi ${student.name}! Just a reminder about your lesson ${dayStr === new Date().toLocaleDateString([], { weekday: "long" }) ? "today" : "tomorrow"} at ${time}. See you then!`;

    try {
      if (isTwilioConfigured) {
        await sendSMS(student.phone, message);
      }
      await supabase
        .from("lessons")
        .update({ reminder_sent_at: new Date().toISOString() })
        .eq("id", lesson.id);
      sent++;
    } catch (err) {
      console.error(`Failed to send SMS to ${student.name}:`, err);
    }
  }

  return { sent };
}

/**
 * Same as sendLessonReminders but scoped to a single user (for manual triggers).
 * Optionally filter to a specific student with studentId.
 */
export async function sendLessonRemindersForUser(userId: string, hoursBeforeLesson = 24, studentId?: string) {
  const supabase = createServiceClient();

  const now = new Date();
  const windowEnd = new Date(now.getTime() + hoursBeforeLesson * 60 * 60 * 1000);

  let query = supabase
    .from("lessons")
    .select("*, student:students(*)")
    .eq("user_id", userId)
    .eq("status", "scheduled")
    .is("reminder_sent_at", null)
    .gte("scheduled_at", now.toISOString())
    .lte("scheduled_at", windowEnd.toISOString());

  if (studentId) {
    query = query.eq("student_id", studentId);
  }

  const { data: lessons, error } = await query;

  if (error) throw error;
  if (!lessons?.length) return { sent: 0, total: 0 };

  const isTwilioConfigured =
    process.env.TWILIO_ACCOUNT_SID &&
    process.env.TWILIO_AUTH_TOKEN &&
    process.env.TWILIO_PHONE_NUMBER;

  let sent = 0;
  const total = lessons.filter((l) => l.student?.phone && l.student?.auto_remind).length;

  for (const lesson of lessons) {
    const student = lesson.student;
    if (!student?.phone || !student.auto_remind) continue;

    const time = new Date(lesson.scheduled_at).toLocaleTimeString([], {
      hour: "numeric",
      minute: "2-digit",
    });
    const dayStr = new Date(lesson.scheduled_at).toLocaleDateString([], {
      weekday: "long",
    });
    const todayStr = new Date().toLocaleDateString([], { weekday: "long" });

    const message = `Hi ${student.name}! Just a reminder about your lesson ${dayStr === todayStr ? "today" : "tomorrow"} at ${time}. See you then!`;

    try {
      if (isTwilioConfigured) {
        await sendSMS(student.phone, message);
      }
      await supabase
        .from("lessons")
        .update({ reminder_sent_at: new Date().toISOString() })
        .eq("id", lesson.id);
      sent++;
    } catch (err) {
      console.error(`Failed to send SMS to ${student.name}:`, err);
    }
  }

  return { sent, total, twilioConfigured: !!isTwilioConfigured };
}
