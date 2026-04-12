import Link from "next/link";
import { getStudents } from "@/lib/students";
import { getTodayAndUpcomingLessons, getCompletedLessonCounts } from "@/lib/lessons";
import StudentList from "@/components/student-list";

export default async function StudentsPage() {
  const [students, upcomingLessons, completedCounts] = await Promise.all([
    getStudents(),
    getTodayAndUpcomingLessons(),
    getCompletedLessonCounts(),
  ]);

  // Build a map: studentId → next lesson label
  const nextLessonLabels: Record<string, string> = {};
  for (const lesson of upcomingLessons) {
    if (lesson.status === "cancelled") continue;
    if (!nextLessonLabels[lesson.student_id]) {
      nextLessonLabels[lesson.student_id] = new Date(lesson.scheduled_at)
        .toLocaleString([], {
          weekday: "short",
          month: "short",
          day: "numeric",
          hour: "numeric",
          minute: "2-digit",
        })
        .toLowerCase();
    }
  }

  // Which students need payment (use same formula as detail page)
  const paymentDueIds = students
    .filter((s) => {
      if (!s.billing_enabled || !s.billing_cycle_lessons) return false;
      const total = (completedCounts[s.id] ?? 0) + (s.cycle_lessons_offset ?? 0);
      const cycleProgress = total % s.billing_cycle_lessons;
      return cycleProgress === 0 && total > 0;
    })
    .map((s) => s.id);

  return (
    <div>
      <div className="flex justify-between items-center mb-5 keepsy-rise keepsy-rise-1">
        <div className="flex items-baseline gap-2">
          <h1
            className="font-display text-2xl"
            style={{ color: "var(--ink-primary)" }}
          >
            students
          </h1>
          <span
            className="text-sm font-display"
            style={{ color: "var(--ink-tertiary)" }}
          >
            · {students.length}
          </span>
        </div>
        <Link
          href="/students/new"
          className="text-sm font-medium transition-colors"
          style={{ color: "var(--accent)", textDecoration: "underline", textUnderlineOffset: "3px" }}
        >
          + add student
        </Link>
      </div>

      {students.length === 0 ? (
        <p
          className="text-center py-12 font-display italic text-base"
          style={{ color: "var(--ink-tertiary)" }}
        >
          no students yet — add your first to get started
        </p>
      ) : (
        <StudentList
          students={students}
          nextLessonLabels={nextLessonLabels}
          paymentDueIds={paymentDueIds}
          completedCounts={completedCounts}
        />
      )}
    </div>
  );
}
