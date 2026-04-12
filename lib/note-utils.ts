/**
 * Extract a short text snippet from a lesson's raw_note JSON.
 * Prefers teacher_notes, falls back to covered items.
 */
export function extractNoteSnippet(rawNote: string | null): string | null {
  if (!rawNote) return null;
  try {
    const parsed = JSON.parse(rawNote);
    const report = parsed.lesson_report;
    if (!report) return null;
    const asArr = (x: unknown) =>
      Array.isArray(x)
        ? (x.filter(
            (s: unknown) => typeof s === "string" && (s as string).trim()
          ) as string[])
        : [];

    // Prefer teacher notes, fall back to covered items
    const teacherNotes = asArr(report.teacher_notes);
    if (teacherNotes.length > 0) return teacherNotes.join(" · ");

    const covered = asArr(report.covered);
    if (covered.length > 0) return covered.join(" · ");

    return null;
  } catch {
    /* not JSON */
  }
  return null;
}
