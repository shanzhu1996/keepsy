"use client";

import { exportLessonNotesToPDF } from "@/lib/pdf-export";
import type { Lesson } from "@/lib/types";

interface StudentDetailClientProps {
  studentName: string;
  studentPhone?: string | null;
  studentEmail?: string | null;
  studentId: string;
  nextLessonTime?: string;
  amountDue?: number;
  autoRemind: boolean;
  lessons: Lesson[];
}

export default function StudentDetailClient({
  studentName,
  lessons,
}: StudentDetailClientProps) {
  const lessonsWithNotes = lessons.filter((l) => l.raw_note || l.student_summary);

  if (lessonsWithNotes.length === 0) return null;

  return (
    <button
      onClick={() => exportLessonNotesToPDF(studentName, lessons)}
      className="text-xs font-medium lesson-cta"
      style={{
        color: "var(--ink-tertiary)",
        textDecoration: "underline",
        textUnderlineOffset: "3px",
        background: "none",
        border: "none",
        cursor: "pointer",
      }}
    >
      export pdf
    </button>
  );
}
