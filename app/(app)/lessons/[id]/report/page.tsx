import { notFound, redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import PrintReport from "@/components/print-report";
import type { LessonReport } from "@/lib/types";

export default async function LessonReportPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: lesson } = await supabase
    .from("lessons")
    .select(
      "id, scheduled_at, duration_min, raw_note, student_summary, student:students(name)"
    )
    .eq("id", id)
    .eq("user_id", user.id)
    .single();

  if (!lesson) notFound();

  const studentName =
    (lesson.student as { name?: string } | null)?.name ?? "Student";

  const emptyReport: LessonReport = {
    covered: [],
    teacher_notes: [],
    assignments: [],
    next_lesson_plan: [],
    materials: [],
  };
  let report: LessonReport = emptyReport;
  if (lesson.raw_note) {
    try {
      const parsed = JSON.parse(lesson.raw_note);
      const r = (parsed.lesson_report ?? {}) as Record<string, unknown>;
      const asArr = (x: unknown) =>
        Array.isArray(x)
          ? x.filter((v): v is string => typeof v === "string")
          : [];
      report = {
        covered: asArr(r.covered),
        teacher_notes: asArr(r.teacher_notes),
        assignments: asArr(r.assignments),
        next_lesson_plan: asArr(r.next_lesson_plan),
        materials: asArr(r.materials),
      };
    } catch {
      /* legacy */
    }
  }

  const d = new Date(lesson.scheduled_at);
  const dateLabel = d.toLocaleDateString([], {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  });
  const timeLabel = d.toLocaleTimeString([], {
    hour: "numeric",
    minute: "2-digit",
  });

  return (
    <PrintReport
      studentName={studentName}
      dateLabel={dateLabel}
      timeLabel={timeLabel}
      durationMin={lesson.duration_min}
      report={report}
    />
  );
}
