import { createServiceClient } from "@/lib/supabase/service";
import { sendSMSToStudent } from "@/lib/sms";
import { sendEmail } from "@/lib/email";

const isTwilioConfigured = () =>
  !!process.env.TWILIO_ACCOUNT_SID &&
  !!process.env.TWILIO_AUTH_TOKEN &&
  !!process.env.TWILIO_PHONE_NUMBER;

const isResendConfigured = () => !!process.env.RESEND_API_KEY;

/**
 * Check if it's currently ~8 AM in the given IANA timezone.
 * Returns true if the local hour is between 7 and 9 (to account for
 * cron running every hour with some drift).
 */
function isMorningInTimezone(tz: string): boolean {
  try {
    const formatter = new Intl.DateTimeFormat("en-US", {
      timeZone: tz,
      hour: "numeric",
      hour12: false,
    });
    const hour = parseInt(formatter.format(new Date()), 10);
    return hour >= 7 && hour <= 9;
  } catch {
    // Invalid timezone — fall back to sending anyway
    return true;
  }
}

/**
 * Format a lesson time in the teacher's timezone.
 */
function formatLessonTime(scheduledAt: string, tz: string) {
  try {
    const d = new Date(scheduledAt);
    const time = d.toLocaleTimeString("en-US", {
      timeZone: tz,
      hour: "numeric",
      minute: "2-digit",
    });
    const day = d.toLocaleDateString("en-US", {
      timeZone: tz,
      weekday: "long",
    });
    const today = new Date().toLocaleDateString("en-US", {
      timeZone: tz,
      weekday: "long",
    });
    const isToday = day === today;
    return { time, day, isToday };
  } catch {
    const d = new Date(scheduledAt);
    return {
      time: d.toLocaleTimeString([], { hour: "numeric", minute: "2-digit" }),
      day: d.toLocaleDateString([], { weekday: "long" }),
      isToday: false,
    };
  }
}

/**
 * Send lesson reminders for all teachers whose local time is ~8 AM.
 * Designed to be called every hour by Vercel Cron.
 * Only sends to students in the next 24 hours with auto_remind enabled.
 */
export async function sendLessonReminders(hoursBeforeLesson = 24) {
  const supabase = createServiceClient();

  const now = new Date();
  const windowEnd = new Date(now.getTime() + hoursBeforeLesson * 60 * 60 * 1000);

  // Get all teachers with their timezones
  const { data: profiles } = await supabase
    .from("teacher_profiles")
    .select("user_id, name, timezone");

  if (!profiles?.length) return { sent: 0, skipped: 0 };

  // Filter to teachers where it's currently morning in their timezone
  const activeTeachers = profiles.filter((p) =>
    isMorningInTimezone(p.timezone || "UTC")
  );

  if (!activeTeachers.length) return { sent: 0, skipped: 0 };

  const activeUserIds = activeTeachers.map((t) => t.user_id);
  const teacherMap = new Map(activeTeachers.map((t) => [t.user_id, t]));

  // Find scheduled lessons in the next 24 hours for active teachers
  const { data: lessons, error } = await supabase
    .from("lessons")
    .select("*, student:students(*)")
    .in("user_id", activeUserIds)
    .eq("status", "scheduled")
    .is("reminder_sent_at", null)
    .gte("scheduled_at", now.toISOString())
    .lte("scheduled_at", windowEnd.toISOString());

  if (error) throw error;
  if (!lessons?.length) return { sent: 0, skipped: 0 };

  let sent = 0;
  let skipped = 0;

  for (const lesson of lessons) {
    const student = lesson.student;
    if (!student?.auto_remind) {
      skipped++;
      continue;
    }

    const teacher = teacherMap.get(lesson.user_id);
    const tz = teacher?.timezone || "UTC";
    const { time, isToday } = formatLessonTime(lesson.scheduled_at, tz);
    const firstName = student.name?.split(" ")[0] || student.name;

    const { time: fmtTime, day: fmtDay, isToday: fmtIsToday } = formatLessonTime(lesson.scheduled_at, tz);
    // Auto cron runs 24h before, so today/tomorrow is accurate
    const message = `Hi ${firstName}! Just a reminder about your lesson ${fmtIsToday ? "today" : "tomorrow"} at ${fmtTime}. See you then!`;

    const contactMethod = student.contact_method || "sms";
    let actuallySent = false;

    try {
      // Send via preferred contact method
      if (contactMethod === "sms" && student.phone && isTwilioConfigured()) {
        await sendSMSToStudent(supabase, student.id, student.phone, message);
        actuallySent = true;
      } else if (contactMethod === "email" && student.email && isResendConfigured()) {
        await sendEmail(
          student.email,
          `Lesson Reminder – ${isToday ? "Today" : "Tomorrow"} at ${time}`,
          message
        );
        actuallySent = true;
      }
      // Fallback: try the other channel if primary didn't work
      else if (student.phone && isTwilioConfigured()) {
        await sendSMSToStudent(supabase, student.id, student.phone, message);
        actuallySent = true;
      } else if (student.email && isResendConfigured()) {
        await sendEmail(
          student.email,
          `Lesson Reminder – ${isToday ? "Today" : "Tomorrow"} at ${time}`,
          message
        );
        actuallySent = true;
      }

      // Only mark as sent if actually delivered
      if (actuallySent) {
        await supabase
          .from("lessons")
          .update({ reminder_sent_at: new Date().toISOString() })
          .eq("id", lesson.id);

        // Log the message
        await supabase.from("message_logs").insert({
          user_id: lesson.user_id,
          student_id: student.id,
          lesson_id: lesson.id,
          type: contactMethod === "email" ? "email" : "sms",
          content: message,
          sent: true,
          sent_at: new Date().toISOString(),
        });

        sent++;
      } else {
        skipped++;
      }
    } catch (err) {
      console.error(`Failed to send reminder to ${student.name}:`, err);
      skipped++;
    }
  }

  return { sent, skipped };
}

/**
 * Same as sendLessonReminders but scoped to a single user (for manual triggers).
 * Ignores timezone check since the teacher is actively requesting it.
 */
export async function sendLessonRemindersForUser(
  userId: string,
  hoursBeforeLesson = 24,
  studentId?: string
) {
  const supabase = createServiceClient();

  // Get teacher profile for timezone
  const { data: profile } = await supabase
    .from("teacher_profiles")
    .select("timezone")
    .eq("user_id", userId)
    .single();

  const tz = profile?.timezone || "UTC";
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

  let sent = 0;
  const eligibleLessons = lessons.filter(
    (l) => l.student?.auto_remind && (l.student?.phone || l.student?.email)
  );
  const total = eligibleLessons.length;

  for (const lesson of eligibleLessons) {
    const student = lesson.student;
    if (!student) continue;

    const { time, day, isToday } = formatLessonTime(lesson.scheduled_at, tz);
    const firstName = student.name?.split(" ")[0] || student.name;

    // Manual trigger — use actual date since teacher may send days ahead
    const dateStr = isToday ? "today" : `on ${day}`;
    const message = `Hi ${firstName}! Just a reminder about your lesson ${dateStr} at ${time}. See you then!`;

    const contactMethod = student.contact_method || "sms";
    let actuallySent = false;

    try {
      if (contactMethod === "sms" && student.phone && isTwilioConfigured()) {
        await sendSMSToStudent(supabase, student.id, student.phone, message);
        actuallySent = true;
      } else if (contactMethod === "email" && student.email && isResendConfigured()) {
        await sendEmail(
          student.email,
          `Lesson Reminder – ${isToday ? "Today" : "Tomorrow"} at ${time}`,
          message
        );
        actuallySent = true;
      } else if (student.phone && isTwilioConfigured()) {
        await sendSMSToStudent(supabase, student.id, student.phone, message);
        actuallySent = true;
      } else if (student.email && isResendConfigured()) {
        await sendEmail(
          student.email,
          `Lesson Reminder – ${isToday ? "Today" : "Tomorrow"} at ${time}`,
          message
        );
        actuallySent = true;
      }

      if (actuallySent) {
        await supabase
          .from("lessons")
          .update({ reminder_sent_at: new Date().toISOString() })
          .eq("id", lesson.id);

        await supabase.from("message_logs").insert({
          user_id: userId,
          student_id: student.id,
          lesson_id: lesson.id,
          type: contactMethod === "email" ? "email" : "sms",
          content: message,
          sent: true,
          sent_at: new Date().toISOString(),
        });

        sent++;
      }
    } catch (err) {
      console.error(`Failed to send reminder to ${student.name}:`, err);
    }
  }

  return { sent, total, twilioConfigured: isTwilioConfigured(), resendConfigured: isResendConfigured() };
}
