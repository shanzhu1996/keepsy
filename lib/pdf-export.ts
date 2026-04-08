import jsPDF from "jspdf";
import type { Lesson } from "@/lib/types";

export async function exportSingleLessonToPDF(
  studentName: string,
  lesson: Lesson
) {
  const doc = new jsPDF();
  const pageHeight = doc.internal.pageSize.getHeight();
  let y = 20;
  const left = 20;
  const width = 170;

  function ensureSpace(needed: number) {
    if (y + needed > pageHeight - 20) {
      doc.addPage();
      y = 20;
    }
  }

  function writeWrapped(text: string, size: number, color: number, bold = false) {
    doc.setFontSize(size);
    doc.setTextColor(color);
    doc.setFont("helvetica", bold ? "bold" : "normal");
    const lines = doc.splitTextToSize(text, width);
    for (const line of lines) {
      ensureSpace(size * 0.5 + 2);
      doc.text(line, left, y);
      y += size * 0.5 + 1;
    }
  }

  const dateStr = new Date(lesson.scheduled_at).toLocaleDateString([], {
    weekday: "long",
    month: "long",
    day: "numeric",
    year: "numeric",
  });

  doc.setFontSize(18);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(0);
  doc.text(`${studentName} — ${dateStr}`, left, y);
  y += 12;

  if (!lesson.raw_note) {
    doc.setFontSize(10);
    doc.setTextColor(120);
    doc.text("No notes recorded for this lesson.", left, y);
    doc.save(`${studentName}-${dateStr}.pdf`);
    return;
  }

  const lines = lesson.raw_note.split("\n");
  for (const line of lines) {
    if (!line.trim()) {
      y += 3;
      continue;
    }
    const h = line.match(/^##\s+(.+)$/);
    if (h) {
      y += 2;
      writeWrapped(h[1], 12, 50, true);
      continue;
    }
    const b = line.match(/^-\s+(.+)$/);
    if (b) {
      writeWrapped(`• ${b[1]}`, 10, 30);
      continue;
    }
    if (line.trim() === "_(none)_") {
      writeWrapped("(none)", 10, 150);
      continue;
    }
    writeWrapped(line, 10, 30);
  }

  doc.save(`${studentName}-${dateStr}.pdf`);
}

export async function exportLessonNotesToPDF(
  studentName: string,
  lessons: Lesson[]
) {
  const doc = new jsPDF();
  const pageHeight = doc.internal.pageSize.getHeight();
  let y = 20;
  const left = 20;
  const width = 170;

  function ensureSpace(needed: number) {
    if (y + needed > pageHeight - 20) {
      doc.addPage();
      y = 20;
    }
  }

  function writeWrapped(text: string, size: number, color: number, bold = false) {
    doc.setFontSize(size);
    doc.setTextColor(color);
    doc.setFont("helvetica", bold ? "bold" : "normal");
    const lines = doc.splitTextToSize(text, width);
    for (const line of lines) {
      ensureSpace(size * 0.5 + 2);
      doc.text(line, left, y);
      y += size * 0.5 + 1;
    }
  }

  // Title
  doc.setFontSize(18);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(0);
  doc.text(`${studentName} — Lesson Notes`, left, y);
  y += 10;

  doc.setFontSize(9);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(120);
  doc.text(`Generated: ${new Date().toLocaleDateString()}`, left, y);
  y += 10;

  const lessonsWithNotes = lessons
    .filter((l) => l.raw_note)
    .sort(
      (a, b) =>
        new Date(b.scheduled_at).getTime() - new Date(a.scheduled_at).getTime()
    );

  if (lessonsWithNotes.length === 0) {
    doc.setTextColor(0);
    doc.text("No lesson notes recorded yet.", left, y);
    doc.save(`${studentName}-lesson-notes.pdf`);
    return;
  }

  for (const lesson of lessonsWithNotes) {
    const dateStr = new Date(lesson.scheduled_at).toLocaleDateString([], {
      weekday: "long",
      month: "long",
      day: "numeric",
      year: "numeric",
    });

    ensureSpace(20);
    y += 4;
    writeWrapped(dateStr, 13, 0, true);
    y += 2;

    if (lesson.raw_note) {
      // Render markdown-ish: ## headings become bold, - bullets indent
      const lines = lesson.raw_note.split("\n");
      for (const line of lines) {
        if (!line.trim()) {
          y += 3;
          continue;
        }
        const h = line.match(/^##\s+(.+)$/);
        if (h) {
          y += 2;
          writeWrapped(h[1], 11, 50, true);
          continue;
        }
        const b = line.match(/^-\s+(.+)$/);
        if (b) {
          writeWrapped(`• ${b[1]}`, 10, 30);
          continue;
        }
        if (line.trim() === "_(none)_") {
          writeWrapped("(none)", 10, 150);
          continue;
        }
        writeWrapped(line, 10, 30);
      }
    }

    y += 6;
  }

  doc.save(`${studentName}-lesson-notes.pdf`);
}
