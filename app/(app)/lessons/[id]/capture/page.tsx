import { redirect, notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getProfile } from "@/lib/settings";
import LessonCapture from "@/components/lesson-capture";
import { extractNoteSnippet } from "@/lib/note-utils";
import type { GeneratedNote } from "@/lib/types";

export default async function LessonCapturePage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ mode?: string }>;
}) {
  const { id } = await params;
  const { mode: modeParam } = await searchParams;
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

  const student = (lesson.student as unknown) as {
    id: string;
    name: string;
    phone: string | null;
    email: string | null;
    contact_method: string;
  } | null;
  const studentName = student?.name ?? "Student";

  const lessonDate = new Date(lesson.scheduled_at);
  const time = lessonDate.toLocaleTimeString([], {
    hour: "numeric",
    minute: "2-digit",
  });
  const dateLabel = lessonDate.toLocaleDateString([], {
    weekday: "short",
    month: "short",
    day: "numeric",
  });

  const profile = await getProfile();
  const teacherName = profile?.name ?? null;

  // Parse existing note if any
  let initialNote: GeneratedNote | null = null;
  const emptyReport = {
    covered: [],
    teacher_notes: [],
    assignments: [],
    next_lesson_plan: [],
    materials: [],
  };
  if (lesson.raw_note) {
    try {
      const parsed = JSON.parse(lesson.raw_note);
      const report = (parsed.lesson_report ?? {}) as Record<string, unknown>;
      const asArr = (x: unknown) =>
        Array.isArray(x)
          ? x.filter((v): v is string => typeof v === "string")
          : [];
      initialNote = {
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
      initialNote = {
        student_message: lesson.student_summary ?? "",
        lesson_report: { ...emptyReport },
      };
    }
  }

  // Next lesson label (same student, after this one)
  let nextLessonLabel: string | null = null;
  // Previous lesson snippet (same student, before this one, with notes)
  let prevLessonSnippet: string | null = null;
  if (student) {
    const [{ data: next }, { data: prev }] = await Promise.all([
      supabase
        .from("lessons")
        .select("scheduled_at")
        .eq("student_id", student.id)
        .eq("user_id", user.id)
        .gt("scheduled_at", lesson.scheduled_at)
        .order("scheduled_at", { ascending: true })
        .limit(1)
        .maybeSingle(),
      supabase
        .from("lessons")
        .select("raw_note, scheduled_at")
        .eq("student_id", student.id)
        .eq("user_id", user.id)
        .lt("scheduled_at", lesson.scheduled_at)
        .not("raw_note", "is", null)
        .order("scheduled_at", { ascending: false })
        .limit(1)
        .maybeSingle(),
    ]);
    if (next?.scheduled_at) {
      const d = new Date(next.scheduled_at);
      nextLessonLabel = `${d.toLocaleDateString([], {
        weekday: "short",
        month: "short",
        day: "numeric",
      })} · ${d.toLocaleTimeString([], { hour: "numeric", minute: "2-digit" })}`;
    }
    if (prev?.raw_note) {
      prevLessonSnippet = extractNoteSnippet(prev.raw_note);
    }
  }


  return (
    <LessonCapture
      lessonId={id}
      studentName={studentName}
      studentPhone={student?.phone ?? null}
      studentEmail={student?.email ?? null}
      contactMethod={student?.contact_method ?? "phone"}
      timeLabel={time}
      dateLabel={dateLabel}
      teacherName={teacherName}
      initialNote={initialNote}
      initialMode={modeParam === "type" ? "type" : "voice"}
      nextLessonLabel={nextLessonLabel}
      prevLessonSnippet={prevLessonSnippet}
    />
  );
}
