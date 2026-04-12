import { redirect, notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getProfile } from "@/lib/settings";
import LessonNotes from "@/components/lesson-notes";
import type { GeneratedNote } from "@/lib/types";

export default async function LessonNotesPage({
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
      "id, scheduled_at, raw_note, student_summary, student_id, student:students(id, name, phone, email, contact_method)"
    )
    .eq("id", id)
    .eq("user_id", user.id)
    .single();

  if (!lesson) notFound();

  // If no notes exist, redirect to capture page
  if (!lesson.raw_note) {
    redirect(`/lessons/${id}/capture`);
  }

  const student = (lesson.student as unknown) as {
    id: string;
    name: string;
    phone: string | null;
    email: string | null;
    contact_method: string;
  } | null;
  const studentName = student?.name ?? "Student";
  const firstName = studentName.split(" ")[0] || studentName;

  const lessonDate = new Date(lesson.scheduled_at);
  const dateLabel = lessonDate.toLocaleDateString([], {
    weekday: "short",
    month: "short",
    day: "numeric",
  });

  const profile = await getProfile();
  const teacherName = profile?.name ?? null;

  // Parse the note
  const asArr = (x: unknown) =>
    Array.isArray(x)
      ? x.filter((v): v is string => typeof v === "string")
      : [];

  let note: GeneratedNote;
  try {
    const parsed = JSON.parse(lesson.raw_note);
    const report = (parsed.lesson_report ?? {}) as Record<string, unknown>;
    note = {
      student_message: lesson.student_summary ?? "",
      lesson_report: {
        covered: asArr(report.covered),
        teacher_notes: asArr(report.teacher_notes),
        assignments: asArr(report.assignments),
        next_lesson_plan: asArr(report.next_lesson_plan),
        materials: asArr(report.materials),
      },
    };
  } catch {
    note = {
      student_message: lesson.student_summary ?? "",
      lesson_report: {
        covered: [],
        teacher_notes: [],
        assignments: [],
        next_lesson_plan: [],
        materials: [],
      },
    };
  }

  // Next lesson label
  let nextLessonLabel: string | null = null;
  if (student) {
    const { data: next } = await supabase
      .from("lessons")
      .select("scheduled_at")
      .eq("student_id", student.id)
      .eq("user_id", user.id)
      .gt("scheduled_at", lesson.scheduled_at)
      .order("scheduled_at", { ascending: true })
      .limit(1)
      .maybeSingle();
    if (next?.scheduled_at) {
      const d = new Date(next.scheduled_at);
      nextLessonLabel = `${d.toLocaleDateString([], {
        weekday: "short",
        month: "short",
        day: "numeric",
      })} · ${d.toLocaleTimeString([], { hour: "numeric", minute: "2-digit" })}`;
    }
  }

  return (
    <LessonNotes
      lessonId={id}
      studentFirstName={firstName}
      studentPhone={student?.phone ?? null}
      studentEmail={student?.email ?? null}
      contactMethod={student?.contact_method ?? "phone"}
      dateLabel={dateLabel}
      teacherName={teacherName}
      initialNote={note}
      nextLessonLabel={nextLessonLabel}
    />
  );
}
