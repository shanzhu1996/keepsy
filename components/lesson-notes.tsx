"use client";

import { useRouter } from "next/navigation";
import LessonResult from "@/components/lesson-result";
import type { GeneratedNote } from "@/lib/types";

interface LessonNotesProps {
  lessonId: string;
  studentFirstName: string;
  studentPhone: string | null;
  studentEmail: string | null;
  contactMethod: string;
  dateLabel: string;
  teacherName: string | null;
  initialNote: GeneratedNote;
  nextLessonLabel: string | null;
}

export default function LessonNotes({
  lessonId,
  studentFirstName,
  studentPhone,
  studentEmail,
  contactMethod,
  dateLabel,
  teacherName,
  initialNote,
  nextLessonLabel,
}: LessonNotesProps) {
  const router = useRouter();

  return (
    <LessonResult
      lessonId={lessonId}
      studentFirstName={studentFirstName}
      studentPhone={studentPhone}
      studentEmail={studentEmail}
      contactMethod={contactMethod}
      dateLabel={dateLabel}
      teacherName={teacherName}
      initialNote={initialNote}
      nextLessonLabel={nextLessonLabel}
      onReRecord={() => {
        router.push(`/lessons/${lessonId}/capture`);
      }}
    />
  );
}
