"use client";

import { exportLessonNotesToPDF } from "@/lib/pdf-export";
import type { Lesson } from "@/lib/types";

interface StudentDetailClientProps {
  studentName: string;
  lessons: Lesson[];
}

export default function StudentDetailClient({
  studentName,
  lessons,
}: StudentDetailClientProps) {
  const handleExportPDF = () => {
    exportLessonNotesToPDF(studentName, lessons);
  };

  const lessonsWithNotes = lessons.filter(
    (l) => l.raw_note || l.student_summary
  );

  return (
    <>
      {lessonsWithNotes.length > 0 && (
        <button
          onClick={handleExportPDF}
          className="text-sm mb-4 transition-colors"
          style={{
            color: "var(--ink-secondary)",
            textDecoration: "underline",
            textUnderlineOffset: "3px",
          }}
        >
          export notes to pdf
        </button>
      )}
    </>
  );
}
