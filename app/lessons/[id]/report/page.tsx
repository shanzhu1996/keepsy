import { notFound, redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getProfile } from "@/lib/settings";
import PrintReport from "@/components/print-report";
import type { LessonReport } from "@/lib/types";
import type { Metadata } from "next";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}): Promise<Metadata> {
  const { id } = await params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { title: "Lesson Summary" };

  const { data: lesson } = await supabase
    .from("lessons")
    .select("scheduled_at, student:students(name)")
    .eq("id", id)
    .eq("user_id", user.id)
    .single();

  if (!lesson) return { title: "Lesson Summary" };

  const studentFirst =
    ((lesson.student as { name?: string } | null)?.name ?? "Student").split(
      " "
    )[0];
  const d = new Date(lesson.scheduled_at);
  const dateShort = d.toLocaleDateString([], {
    weekday: "short",
    month: "short",
    day: "numeric",
  });

  return { title: `Lesson Summary – ${studentFirst} · ${dateShort}` };
}

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

  const profile = await getProfile();
  const teacherName = profile?.name ?? null;

  return (
    <PrintReport
      studentName={studentName}
      dateLabel={dateLabel}
      timeLabel={timeLabel}
      durationMin={lesson.duration_min}
      report={report}
      teacherName={teacherName}
    />
  );
}
