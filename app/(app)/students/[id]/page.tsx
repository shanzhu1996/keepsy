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

  // Find the next upcoming lesson
  const now = new Date();
  const nextLesson = lessons
    .filter((l) => new Date(l.scheduled_at) > now && l.status !== "cancelled")
    .sort((a, b) => new Date(a.scheduled_at).getTime() - new Date(b.scheduled_at).getTime())[0];
  const nextLessonTime = nextLesson
    ? new Date(nextLesson.scheduled_at).toLocaleString([], {
        weekday: "short", month: "short", day: "numeric",
        hour: "numeric", minute: "2-digit",
      })
    : undefined;

  // ── Billing cycle computation ──────────────────────────────────────────────
  const cycleLength = student.billing_cycle_lessons ?? 0;

  const completedLessons = lessons
    .filter((l) => l.status === "completed")
    .sort((a, b) => new Date(a.scheduled_at).getTime() - new Date(b.scheduled_at).getTime());

  const paidCount = payments.filter((p) => p.status === "paid").length;
  const offset = student.cycle_lessons_offset ?? 0;
  const totalCompleted = completedLessons.length + offset;
  const completedCycles = cycleLength > 0 ? Math.floor(totalCompleted / cycleLength) : 0;
  const currentCycleProgress = cycleLength > 0 ? totalCompleted % cycleLength : 0;
  // If there's an offset, the first cycle is pre-paid (teacher was already paid before using the app)
  const prePaidCycles = offset > 0 ? 1 : 0;
  const unpaidCompleteCycles = Math.max(0, completedCycles - paidCount - prePaidCycles);
  const hasCurrentCyclePaid = (paidCount + prePaidCycles) > completedCycles;

  // Status
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
    const startIdx = completedCycles * cycleLength - offset;
    lessonsInCurrentCycle = currentCycleProgress;
    isCurrentCycleComplete = false;
    cycleStartDate = currentCycleProgress > 0 ? completedLessons[Math.max(0, startIdx)]?.scheduled_at ?? null : null;
    cycleEndDate = null;
  }

  const amountDue = unpaidCompleteCycles > 0 ? (student.cycle_price ?? 0) : 0;

  // Find last sent message date for preview hint
  const lastMessage = messageLogs.find((m) => m.sent);
  const lastMessageHint = lastMessage
    ? `last ${lastMessage.type === "lesson_reminder" ? "reminder" : lastMessage.type === "payment_reminder" ? "payment" : "sent"} ${new Date(lastMessage.sent_at || lastMessage.created_at).toLocaleDateString([], { month: "short", day: "numeric" })}`
    : null;

  // Last payment hint for collapsed payments section
  const lastPaidPayment = payments.find((p) => p.status === "paid");
  const lastPaymentHint = lastPaidPayment?.paid_at
    ? `last paid ${new Date(lastPaidPayment.paid_at).toLocaleDateString([], { month: "short", day: "numeric" })}`
    : null;

  // Count of completed lessons with notes for progress threshold
  const lessonsWithNotes = completedLessons.filter((l) => l.raw_note).length;

  return (
    <div>
      {/* Settings tip — one-time, after first student with billing */}
      <SettingsTip hasBilling={student.billing_enabled && !!student.cycle_price} />

      {/* ─── Header: name + contact + actions ─── */}
      <div className="mb-3 keepsy-rise keepsy-rise-1">
        {/* Back link */}
        <Link
          href="/students"
          className="text-[13px] mb-2 inline-block"
          style={{
            color: "var(--ink-secondary)",
          }}
        >
          ‹ students
        </Link>

        <div className="flex justify-between items-start">
          <div>
            <h1
              className="font-display text-2xl"
              style={{ color: "var(--ink-primary)" }}
            >
              {student.name.toLowerCase()}
            </h1>
            {(student.email || student.phone) && (
              <div className="flex items-center gap-1.5 mt-1 flex-wrap" style={{ fontSize: "13px", color: "var(--ink-tertiary)" }}>
                {student.email && (
                  <a
                    href={`mailto:${student.email}`}
                    className="contact-link"
                  >
                    {student.email}
                  </a>
                )}
                {student.email && student.phone && (
                  <span style={{ color: "var(--ink-tertiary)" }}>·</span>
                )}
                {student.phone && (
                  <a
                    href={`tel:${student.phone}`}
                    className="contact-link"
                  >
                    {student.phone}
                  </a>
                )}
              </div>
            )}
          </div>
          {/* edit link moved to action bar below */}
        </div>

        {/* Notes — teacher's personal annotation */}
        {student.notes && (
          <p
            className="font-display text-sm italic mt-3"
            style={{ color: "var(--ink-tertiary)", lineHeight: 1.5 }}
          >
            {student.notes}
          </p>
        )}

        {/* ─── Quick action bar ─── */}
        <div className="flex gap-2 mt-3">
          <AddLessonButton
            studentId={id}
            studentName={student.name}
            defaultDuration={student.lesson_default_duration_min ?? undefined}
            billingCycleLessons={student.billing_cycle_lessons}
            variant="compact"
          />
          <Link
            href={`/students/${id}/edit`}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-[10px] transition-colors"
            style={{
              fontSize: "13px",
              fontWeight: 500,
              border: "1px solid var(--line-strong)",
              backgroundColor: "var(--bg-surface)",
              color: "var(--ink-primary)",
            }}
          >
            edit
          </Link>
        </div>
      </div>

      {/* ─── Billing ─── */}
      <div className="keepsy-rise keepsy-rise-2">
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

      {!student.billing_enabled && (
        <div className="mb-3 keepsy-rise keepsy-rise-2">
          <span className="text-xs" style={{ color: "var(--ink-tertiary)" }}>
            billing off
          </span>
        </div>
      )}

      {/* ─── Progress Summary ─── */}
      <StudentProgressSummary
        summary={student.progress_summary}
        updatedAt={student.progress_summary_updated_at}
        lessonCount={lessonsWithNotes}
      />

      {/* ─── Lessons ─── */}
      <div
        className="mt-3 mb-2"
        style={{ height: "1px", backgroundColor: "var(--line-strong)" }}
      />

      <div className="mb-3 keepsy-rise keepsy-rise-3">
        <h2
          className="font-display text-lg"
          style={{ color: "var(--ink-primary)" }}
        >
          lessons
        </h2>
      </div>

      <StudentLessons lessons={lessons} studentName={student.name} />

      {/* ─── Messages ─── */}
      <div
        className="mt-3 mb-2"
        style={{ height: "1px", backgroundColor: "var(--line-strong)" }}
      />

      <div id="messages" className="keepsy-rise keepsy-rise-4">
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

      {/* ─── Payment history ─── */}
      {student.billing_enabled && payments.length > 0 && (
        <>
          <div
            className="mt-3 mb-2"
            style={{ height: "1px", backgroundColor: "var(--line-strong)" }}
          />
          <StudentPayments payments={payments} lastPaymentHint={lastPaymentHint} />
        </>
      )}
    </div>
  );
}
