"use client";

import { Button } from "@/components/ui/button";
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
        <Button
          onClick={handleExportPDF}
          variant="outline"
          size="sm"
          className="mb-4"
        >
          📥 Export Notes to PDF
        </Button>
      )}
    </>
  );
}
