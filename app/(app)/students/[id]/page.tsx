import { notFound } from "next/navigation";
import Link from "next/link";
import { getStudent } from "@/lib/students";
import { getLessonsForStudent } from "@/lib/lessons";
import { getPaymentsForStudent } from "@/lib/payments";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
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

  // What to display in the progress bar:
  // If there's an unpaid complete cycle → show that full cycle (N/N)
  // Otherwise → show current partial cycle progress
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
      {/* Student header — amber banner, white text */}
      <div className="bg-amber-700 rounded-xl px-4 py-5 mb-4 flex justify-between items-start">
        <div>
          <h1 className="text-2xl font-bold text-white">{student.name}</h1>
          {student.email && (
            <p className="text-sm text-amber-100 mt-0.5">{student.email}</p>
          )}
          {student.phone && (
            <p className="text-sm text-amber-100">{student.phone}</p>
          )}
        </div>
        <Link href={`/students/${id}/edit`}>
          <button className="text-xs text-amber-100 border border-amber-400 rounded-md px-3 py-1.5 hover:bg-amber-600 transition-colors">
            Edit
          </button>
        </Link>
      </div>

      {student.notes && (
        <p className="text-sm text-gray-600 mb-4 bg-gray-50 p-3 rounded">
          {student.notes}
        </p>
      )}

      <StudentPaymentBanner
        student={student}
        billingStatus={billingStatus}
        lessonsInCurrentCycle={lessonsInCurrentCycle}
        isCurrentCycleComplete={isCurrentCycleComplete}
        amountDue={amountDue}
        cycleStartDate={cycleStartDate}
        cycleEndDate={cycleEndDate}
      />

      {!student.billing_enabled && (
        <div className="mb-2">
          <Badge variant="outline">Billing off</Badge>
        </div>
      )}

      <StudentMessagingClient
        studentName={student.name}
        studentPhone={student.phone}
        studentEmail={student.email}
        studentId={student.id}
        nextLessonTime={nextLessonTime}
        amountDue={amountDue}
        autoRemind={student.auto_remind}
      />

      <Separator className="my-6" />

      <div className="flex justify-between items-center mb-3">
        <h2 className="text-lg font-semibold">Lessons</h2>
        <Link href={`/today?newLesson=true&studentId=${id}`}>
          <Button size="sm" variant="outline">
            + Lesson
          </Button>
        </Link>
      </div>

      <StudentDetailClient studentName={student.name} lessons={lessons} />

      {lessons.length === 0 ? (
        <p className="text-sm text-gray-500 py-4">No lessons yet.</p>
      ) : (
        <div className="space-y-2 mb-6">
          {lessons.slice(0, 10).map((lesson) => (
            <LessonCard key={lesson.id} lesson={lesson} showStudent={false} studentName={student.name} />
          ))}
        </div>
      )}

      {student.billing_enabled && payments.length > 0 && (
        <>
          <Separator className="my-6" />
          <h2 className="text-lg font-semibold mb-3 text-gray-900">Payment History</h2>
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
