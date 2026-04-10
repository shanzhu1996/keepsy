import { notFound } from "next/navigation";
import Link from "next/link";
import { getStudent } from "@/lib/students";
import { getLessonsForStudent } from "@/lib/lessons";
import { getPaymentsForStudent } from "@/lib/payments";
import LessonCard from "@/components/lesson-card";
import PaymentCard from "@/components/payment-card";
import StudentDetailClient from "@/components/student-detail-client";
import StudentMessagingClient from "@/components/student-messaging-client";
import StudentPaymentBanner from "@/components/student-payment-banner";

export default async function StudentDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const student = await getStudent(id);
  if (!student) notFound();

  const [lessons, payments] = await Promise.all([
    getLessonsForStudent(id),
    getPaymentsForStudent(id),
  ]);

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
  const totalCompleted = completedLessons.length;
  const completedCycles = cycleLength > 0 ? Math.floor(totalCompleted / cycleLength) : 0;
  const currentCycleProgress = cycleLength > 0 ? totalCompleted % cycleLength : 0;
  const unpaidCompleteCycles = Math.max(0, completedCycles - paidCount);
  const hasCurrentCyclePaid = paidCount > completedCycles;

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
    const startIdx = paidCount * cycleLength;
    lessonsInCurrentCycle = cycleLength;
    isCurrentCycleComplete = true;
    cycleStartDate = completedLessons[startIdx]?.scheduled_at ?? null;
    cycleEndDate = completedLessons[startIdx + cycleLength - 1]?.scheduled_at ?? null;
  } else {
    const startIdx = completedCycles * cycleLength;
    lessonsInCurrentCycle = currentCycleProgress;
    isCurrentCycleComplete = false;
    cycleStartDate = currentCycleProgress > 0 ? completedLessons[startIdx]?.scheduled_at ?? null : null;
    cycleEndDate = null;
  }

  const amountDue = unpaidCompleteCycles > 0 ? (student.cycle_price ?? 0) : 0;

  return (
    <div>
      {/* Student header — clean Fraunces on canvas */}
      <div className="mb-5 keepsy-rise keepsy-rise-1">
        <div className="flex justify-between items-start">
          <div>
            <h1
              className="font-display text-2xl"
              style={{ color: "var(--ink-primary)" }}
            >
              {student.name.toLowerCase()}
            </h1>
            {student.email && (
              <p className="text-sm mt-0.5" style={{ color: "var(--ink-secondary)" }}>
                {student.email}
              </p>
            )}
            {student.phone && (
              <p className="text-sm" style={{ color: "var(--ink-secondary)" }}>
                {student.phone}
              </p>
            )}
          </div>
          <Link
            href={`/students/${id}/edit`}
            className="text-xs font-medium transition-colors"
            style={{
              color: "var(--ink-secondary)",
              textDecoration: "underline",
              textUnderlineOffset: "3px",
            }}
          >
            edit
          </Link>
        </div>
      </div>

      {student.notes && (
        <div
          className="rounded-xl px-3.5 py-3 mb-4 keepsy-rise keepsy-rise-2"
          style={{
            backgroundColor: "var(--bg-surface)",
            border: "1px solid var(--line-subtle)",
          }}
        >
          <p className="text-sm italic" style={{ color: "var(--ink-secondary)" }}>
            {student.notes}
          </p>
        </div>
      )}

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
          <span
            className="text-xs"
            style={{ color: "var(--ink-tertiary)" }}
          >
            billing off
          </span>
        </div>
      )}

      <div className="keepsy-rise keepsy-rise-3">
        <StudentMessagingClient
          studentName={student.name}
          studentPhone={student.phone}
          studentEmail={student.email}
          studentId={student.id}
          nextLessonTime={nextLessonTime}
          amountDue={amountDue}
          autoRemind={student.auto_remind}
        />
      </div>

      {/* Divider */}
      <div
        className="my-5"
        style={{ height: "1px", backgroundColor: "var(--line-strong)" }}
      />

      <div className="flex justify-between items-center mb-3 keepsy-rise keepsy-rise-3">
        <h2
          className="font-display text-lg"
          style={{ color: "var(--ink-primary)" }}
        >
          lessons
        </h2>
        <Link
          href={`/today?newLesson=true&studentId=${id}`}
          className="text-sm font-medium transition-colors"
          style={{ color: "var(--accent)", textDecoration: "underline", textUnderlineOffset: "3px" }}
        >
          + lesson
        </Link>
      </div>

      <StudentDetailClient studentName={student.name} lessons={lessons} />

      {lessons.length === 0 ? (
        <p
          className="text-sm py-4 font-display italic"
          style={{ color: "var(--ink-tertiary)" }}
        >
          no lessons yet
        </p>
      ) : (
        <div className="space-y-2 mb-6">
          {lessons.map((lesson) => (
            <LessonCard key={lesson.id} lesson={lesson} showStudent={false} studentName={student.name} />
          ))}
        </div>
      )}

      {student.billing_enabled && payments.length > 0 && (
        <>
          <div
            className="my-5"
            style={{ height: "1px", backgroundColor: "var(--line-strong)" }}
          />
          <h2
            className="font-display text-lg mb-3"
            style={{ color: "var(--ink-primary)" }}
          >
            payment history
          </h2>
          <div className="space-y-2">
            {payments.map((payment) => (
              <PaymentCard
                key={payment.id}
                payment={payment}
                showStudent={false}
              />
            ))}
          </div>
        </>
      )}
    </div>
  );
}
