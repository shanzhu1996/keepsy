import { notFound } from "next/navigation";
import Link from "next/link";
import { getStudent } from "@/lib/students";
import { getLessonsForStudent } from "@/lib/lessons";
import { getPaymentsForStudent } from "@/lib/payments";
import { getMessagesForStudent } from "@/lib/messages";
import { getProfile } from "@/lib/settings";
import StudentPaymentBanner from "@/components/student-payment-banner";
import StudentLessons from "@/components/student-lessons";
import StudentMessages from "@/components/student-messages";
import StudentPayments from "@/components/student-payments";
import AddLessonButton from "@/components/add-lesson-button";
import StudentProgressSummary from "@/components/student-progress-summary";
import SettingsTip from "@/components/settings-tip";

export default async function StudentDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const student = await getStudent(id);
  if (!student) notFound();

  const [lessons, payments, messageLogs, profile] = await Promise.all([
    getLessonsForStudent(id),
    getPaymentsForStudent(id),
    getMessagesForStudent(id),
    getProfile(),
  ]);

  const teacherFirstName = profile?.name?.split(" ")[0] || null;
  const now = new Date();

  // Next lesson
  const upcomingLessons = lessons
    .filter((l) => new Date(l.scheduled_at) > now && l.status !== "cancelled")
    .sort((a, b) => new Date(a.scheduled_at).getTime() - new Date(b.scheduled_at).getTime());
  const nextLesson = upcomingLessons[0];
  const nextLessonTime = nextLesson
    ? new Date(nextLesson.scheduled_at).toLocaleString([], {
        weekday: "short", month: "short", day: "numeric",
        hour: "numeric", minute: "2-digit",
      })
    : undefined;

  // Billing
  const cycleLength = student.billing_cycle_lessons ?? 0;
  const completedLessons = lessons
    .filter((l) => l.status === "completed")
    .sort((a, b) => new Date(a.scheduled_at).getTime() - new Date(b.scheduled_at).getTime());
  const paidCount = payments.filter((p) => p.status === "paid").length;
  const offset = student.cycle_lessons_offset ?? 0;
  const totalCompleted = completedLessons.length + offset;
  const completedCycles = cycleLength > 0 ? Math.floor(totalCompleted / cycleLength) : 0;
  const currentCycleProgress = cycleLength > 0 ? totalCompleted % cycleLength : 0;
  const prePaidCycles = offset > 0 ? 1 : 0;
  const unpaidCompleteCycles = Math.max(0, completedCycles - paidCount - prePaidCycles);
  const hasCurrentCyclePaid = (paidCount + prePaidCycles) > completedCycles;

  const billingStatus: "overdue" | "paid" | "pending" =
    unpaidCompleteCycles > 0 || (currentCycleProgress > 0 && !hasCurrentCyclePaid)
      ? "overdue"
      : currentCycleProgress > 0 || paidCount > 0
      ? "paid"
      : "pending";

  let lessonsInCurrentCycle: number;
  let cycleStartDate: string | null;
  let cycleEndDate: string | null;
  let isCurrentCycleComplete: boolean;

  if (unpaidCompleteCycles > 0) {
    const startIdx = (paidCount + prePaidCycles) * cycleLength - offset;
    lessonsInCurrentCycle = cycleLength;
    isCurrentCycleComplete = true;
    cycleStartDate = completedLessons[Math.max(0, startIdx)]?.scheduled_at ?? null;
    cycleEndDate = completedLessons[Math.max(0, startIdx) + cycleLength - 1]?.scheduled_at ?? null;
  } else {
    lessonsInCurrentCycle = currentCycleProgress;
    isCurrentCycleComplete = false;
    const startIdx = completedCycles * cycleLength - offset;
    cycleStartDate = currentCycleProgress > 0 ? completedLessons[Math.max(0, startIdx)]?.scheduled_at ?? null : null;
    cycleEndDate = null;
  }

  const amountDue = unpaidCompleteCycles > 0 ? (student.cycle_price ?? 0) : 0;

  // Messages
  const lastMessage = messageLogs.find((m) => m.sent);
  const lastMessageHint = lastMessage
    ? `last ${lastMessage.type === "lesson_reminder" ? "reminder" : lastMessage.type === "payment_reminder" ? "payment" : "sent"} ${new Date(lastMessage.sent_at || lastMessage.created_at).toLocaleDateString([], { month: "short", day: "numeric" })}`
    : null;

  // Payments
  const lastPaidPayment = payments.find((p) => p.status === "paid");
  const lastPaymentHint = lastPaidPayment?.paid_at
    ? `last paid ${new Date(lastPaidPayment.paid_at).toLocaleDateString([], { month: "short", day: "numeric" })}`
    : null;

  const lessonsWithNotes = completedLessons.filter((l) => l.raw_note).length;

  return (
    <div>
      <SettingsTip hasBilling={student.billing_enabled && !!student.cycle_price} />

      {/* ═══ ZONE 1: HERO ═══ */}
      <div className="mb-8 keepsy-rise keepsy-rise-1">
        <div className="flex justify-between items-start">
          <Link href="/students" className="text-[13px] mb-2 inline-block" style={{ color: "var(--ink-secondary)" }}>
            ‹ students
          </Link>
          <Link
            href={`/students/${id}/edit`}
            className="text-[13px] font-medium"
            style={{ color: "var(--ink-secondary)", textDecoration: "underline", textUnderlineOffset: "3px" }}
          >
            edit
          </Link>
        </div>

        <h1
          className="font-display"
          style={{
            fontSize: "28px",
            fontWeight: 400,
            letterSpacing: "-0.02em",
            color: "var(--ink-primary)",
            lineHeight: "34px",
          }}
        >
          {student.name.toLowerCase()}
        </h1>

        {(student.email || student.phone) && (
          <div className="flex items-center gap-1.5 mt-1 flex-wrap" style={{ fontSize: "13px", color: "var(--ink-tertiary)" }}>
            {student.email && <a href={`mailto:${student.email}`} className="contact-link">{student.email}</a>}
            {student.email && student.phone && <span>·</span>}
            {student.phone && <a href={`tel:${student.phone}`} className="contact-link">{student.phone}</a>}
          </div>
        )}

        {student.notes && (
          <p className="font-display text-sm italic mt-3" style={{ color: "var(--ink-tertiary)", lineHeight: 1.5 }}>
            {student.notes}
          </p>
        )}
      </div>

      {/* ═══ ZONE 2: CONTENT ═══ */}
      <div className="keepsy-rise keepsy-rise-2 mb-6">
        <div className="flex justify-between items-center mb-4">
          <h2
            className="font-display text-[17px]"
            style={{ color: "var(--ink-primary)", letterSpacing: "-0.01em" }}
          >
            lessons
          </h2>
          <AddLessonButton
            studentId={id}
            studentName={student.name}
            defaultDuration={student.lesson_default_duration_min ?? undefined}
            billingCycleLessons={student.billing_cycle_lessons}
          />
        </div>
        <StudentLessons
          lessons={lessons}
          studentName={student.name}
          studentId={id}
        />
      </div>

      {/* ═══ ZONE 3: STATUS ═══ */}

      {/* Progress Summary */}
      <StudentProgressSummary
        summary={student.progress_summary}
        updatedAt={student.progress_summary_updated_at}
        lessonCount={lessonsWithNotes}
      />

      {/* Billing */}
      {student.billing_enabled ? (
        <div className="mt-8 pt-6 keepsy-rise keepsy-rise-3" style={{ borderTop: "1px solid var(--line-subtle)" }}>
          <StudentPaymentBanner
            student={student}
            billingStatus={billingStatus}
            lessonsInCurrentCycle={lessonsInCurrentCycle}
            isCurrentCycleComplete={isCurrentCycleComplete}
            amountDue={amountDue}
            cycleStartDate={cycleStartDate}
            cycleEndDate={cycleEndDate}
          />
        </div>
      ) : null}

      {/* Messages */}
      <div className="mt-8 pt-6 keepsy-rise keepsy-rise-4" style={{ borderTop: "1px solid var(--line-subtle)" }}>
        <StudentMessages
          messages={messageLogs}
          studentName={student.name}
          studentPhone={student.phone}
          studentEmail={student.email}
          studentId={student.id}
          nextLessonTime={nextLessonTime}
          amountDue={amountDue || (student.cycle_price ?? undefined)}
          autoRemind={student.auto_remind}
          contactMethod={student.contact_method}
          teacherName={teacherFirstName}
          lastMessageHint={lastMessageHint}
        />
      </div>

      {/* Payments */}
      <div className="mt-8 pt-6 mb-8" style={{ borderTop: "1px solid var(--line-subtle)" }}>
        <StudentPayments payments={payments} lastPaymentHint={lastPaymentHint} />
      </div>
    </div>
  );
}
