"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import type { GeneratedNote, LessonReport } from "@/lib/types";

interface LessonResultProps {
  lessonId: string;
  studentFirstName: string;
  studentPhone: string | null;
  studentEmail: string | null;
  contactMethod: string;
  dateLabel: string;
  teacherName: string | null;
  initialNote: GeneratedNote;
  nextLessonLabel: string | null;
  onReRecord: () => void;
}

type ReportKey = keyof LessonReport;

const REPORT_SECTIONS: { key: ReportKey; label: string; emptyHint: string; optional?: boolean }[] = [
  { key: "covered", label: "covered", emptyHint: "what you worked on" },
  { key: "assignments", label: "assignments", emptyHint: "what to practice" },
  { key: "next_lesson_plan", label: "next class", emptyHint: "what to focus on" },
  { key: "materials", label: "materials", emptyHint: "links, sheet music, resources", optional: true },
];

export default function LessonResult({
  lessonId,
  studentFirstName,
  studentPhone,
  studentEmail,
  contactMethod,
  dateLabel,
  teacherName,
  initialNote,
  nextLessonLabel,
  onReRecord,
}: LessonResultProps) {
  const router = useRouter();
  const [note, setNote] = useState<GeneratedNote>(initialNote);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [sendOpen, setSendOpen] = useState(false);
  const [sent, setSent] = useState(false);
  const [copied, setCopied] = useState(false);
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Teacher's notes — free-form text (private observations)
  const [teacherNotes, setTeacherNotes] = useState(
    note.lesson_report.teacher_notes.join("\n")
  );

  // Auto-resize textarea
  const notesRef = useRef<HTMLTextAreaElement>(null);
  function autoResize() {
    const ta = notesRef.current;
    if (ta) {
      ta.style.height = "auto";
      ta.style.height = Math.max(ta.scrollHeight, 72) + "px";
    }
  }
  useEffect(() => {
    autoResize();
  }, [teacherNotes]);

  function scheduleSave(next: GeneratedNote, teacherNotesText?: string) {
    if (saveTimer.current) clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(() => {
      const reportToSave = {
        ...next.lesson_report,
        teacher_notes:
          teacherNotesText !== undefined
            ? teacherNotesText
                .split("\n")
                .map((s) => s.trim())
                .filter(Boolean)
            : next.lesson_report.teacher_notes,
      };
      fetch(`/api/lessons/${lessonId}/note`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          student_message: next.student_message,
          lesson_report: reportToSave,
        }),
      }).catch(() => {});
    }, 600);
  }

  useEffect(() => {
    return () => {
      if (saveTimer.current) clearTimeout(saveTimer.current);
    };
  }, []);

  function updateTeacherNotes(text: string) {
    setTeacherNotes(text);
    scheduleSave(note, text);
  }

  async function handleSaveAndClose() {
    if (saveTimer.current) clearTimeout(saveTimer.current);
    setSaving(true);
    const teacherNotesArr = teacherNotes
      .split("\n")
      .map((s) => s.trim())
      .filter(Boolean);
    try {
      await fetch(`/api/lessons/${lessonId}/note`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          student_message: note.student_message,
          lesson_report: { ...note.lesson_report, teacher_notes: teacherNotesArr },
        }),
      });
      router.refresh();
      router.back();
    } catch {
      setSaving(false);
      setError("Couldn't save");
    }
  }

  function updateSectionItem(key: ReportKey, i: number, text: string) {
    const nextList = [...note.lesson_report[key]];
    nextList[i] = text;
    const next = {
      ...note,
      lesson_report: { ...note.lesson_report, [key]: nextList },
    };
    setNote(next);
    scheduleSave(next);
  }

  function addSectionItem(key: ReportKey) {
    const next = {
      ...note,
      lesson_report: {
        ...note.lesson_report,
        [key]: [...note.lesson_report[key], ""],
      },
    };
    setNote(next);
    scheduleSave(next);
  }

  function removeSectionItem(key: ReportKey, i: number) {
    const next = {
      ...note,
      lesson_report: {
        ...note.lesson_report,
        [key]: note.lesson_report[key].filter((_, idx) => idx !== i),
      },
    };
    setNote(next);
    scheduleSave(next);
  }

  function buildReportMessage(): string {
    const parts: string[] = [];

    // Greeting
    parts.push(`Hi ${studentFirstName},`);
    parts.push("");
    parts.push("Great work today! Here's a summary of our lesson:");
    parts.push("");

    const covered = note.lesson_report.covered.filter(Boolean);
    if (covered.length) {
      parts.push("What we covered:");
      covered.forEach((c) => parts.push(`  • ${c}`));
      parts.push("");
    }

    const assignments = note.lesson_report.assignments.filter(Boolean);
    if (assignments.length) {
      parts.push("Assignments:");
      assignments.forEach((a) => parts.push(`  • ${a}`));
      parts.push("");
    }

    const nextPlan = note.lesson_report.next_lesson_plan.filter(Boolean);
    if (nextPlan.length) {
      parts.push("Next class:");
      nextPlan.forEach((n) => parts.push(`  • ${n}`));
      parts.push("");
    }

    const materials = note.lesson_report.materials.filter(Boolean);
    if (materials.length) {
      parts.push("Materials:");
      materials.forEach((m) => parts.push(`  • ${m}`));
      parts.push("");
    }

    if (nextLessonLabel) {
      parts.push(`Next lesson: ${nextLessonLabel}`);
      parts.push("");
    }

    // Sign-off
    const firstName = teacherName?.split(" ")[0] ?? null;
    parts.push("Best,");
    parts.push(firstName ?? "Your teacher");

    return parts.join("\n").trim();
  }

  async function handleCopyReport() {
    const text = buildReportMessage();
    try {
      if (typeof navigator !== "undefined" && "vibrate" in navigator) {
        navigator.vibrate?.(10);
      }
      try {
        await navigator.clipboard.writeText(text);
      } catch {
        const ta = document.createElement("textarea");
        ta.value = text;
        ta.style.position = "fixed";
        ta.style.opacity = "0";
        document.body.appendChild(ta);
        ta.select();
        document.execCommand("copy");
        document.body.removeChild(ta);
      }
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      setError("Couldn't copy");
      return;
    }

    const teacherNotesArr = teacherNotes
      .split("\n")
      .map((s) => s.trim())
      .filter(Boolean);
    if (saveTimer.current) clearTimeout(saveTimer.current);
    fetch(`/api/lessons/${lessonId}/note`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        student_message: buildReportMessage(),
        lesson_report: {
          ...note.lesson_report,
          teacher_notes: teacherNotesArr,
        },
      }),
    })
      .then(() =>
        fetch(`/api/lessons/${lessonId}/mark-sent`, { method: "POST" })
      )
      .catch(() => {});
  }

  const hasCovered = note.lesson_report.covered.filter(Boolean).length > 0;

  const canSendSMS = !!studentPhone;
  const canSendEmail = !!studentEmail;

  return (
    <div className="fixed inset-0 bg-[var(--bg-canvas)] flex flex-col z-[60] overflow-y-auto">
      {/* Header */}
      <header
        className="flex items-center justify-between px-4 py-3 sticky top-0 bg-[var(--bg-canvas)] z-10"
        style={{ borderBottom: "1px solid var(--line-subtle)" }}
      >
        <button
          type="button"
          onClick={() => { router.refresh(); router.back(); }}
          className="flex items-center gap-1 text-[14px] py-1 px-1"
          style={{ color: "var(--ink-secondary)" }}
          aria-label="Close"
        >
          <span style={{ fontSize: "18px", lineHeight: 1 }}>×</span>
          <span>close</span>
        </button>
        <div
          className="text-[15px] font-semibold"
          style={{ color: "var(--ink-primary)", letterSpacing: "-0.01em" }}
        >
          {studentFirstName} · {dateLabel}
        </div>
        <button
          type="button"
          onClick={() => {
            if (!confirm("Start over? Your current report will be lost.")) return;
            onReRecord();
          }}
          className="text-[13px] py-1 px-1"
          style={{
            color: "var(--ink-tertiary)",
            textDecoration: "underline",
            textUnderlineOffset: "3px",
            textDecorationThickness: "1px",
          }}
        >
          start over
        </button>
      </header>

      {/* Body */}
      <div className="flex-1 px-5 pt-5 pb-48 max-w-lg w-full mx-auto">
        {/* ─── Teacher's Notes ─── */}
        <div className="mb-6">
          <div className="flex items-baseline justify-between mb-3">
            <h2
              className="text-[13px] font-semibold uppercase"
              style={{ color: "var(--ink-secondary)", letterSpacing: "0.06em" }}
            >
              notes for teacher
            </h2>
            <span
              className="text-[10px] font-medium px-2 py-0.5 rounded-full"
              style={{
                backgroundColor: "var(--bg-muted)",
                color: "var(--ink-tertiary)",
                letterSpacing: "0.02em",
              }}
            >
              private · not sent
            </span>
          </div>
          <textarea
            ref={notesRef}
            value={teacherNotes}
            onChange={(e) => {
              updateTeacherNotes(e.target.value);
              autoResize();
            }}
            placeholder={`Summary of today's lesson, observations, things to remember...`}
            className="keepsy-editable-field w-full text-[15px] px-0 py-1 outline-none resize-none bg-transparent"
            style={{
              color: "var(--ink-primary)",
              lineHeight: "1.7",
              minHeight: "72px",
            }}
          />
        </div>

        {/* ─── Lesson Report ─── */}
        <div>
          <div className="flex items-baseline justify-between mb-4">
            <h2
              className="text-[13px] font-semibold uppercase"
              style={{ color: "var(--ink-secondary)", letterSpacing: "0.06em" }}
            >
              notes for {studentFirstName}
            </h2>
            <span
              className="text-[11px]"
              style={{ color: "var(--ink-tertiary)" }}
            >
              shared with student
            </span>
          </div>

          <div className="space-y-5">
            {REPORT_SECTIONS.filter(({ key, optional }) => {
              if (!optional) return true;
              // Show optional sections if they have any items (including empty ones being edited)
              return note.lesson_report[key].length > 0;
            }).map(({ key, label, emptyHint }) => {
              const items = note.lesson_report[key];
              const hasItems = items.filter(Boolean).length > 0;
              return (
                <div key={key}>
                  <div className="flex items-center gap-2 mb-1.5">
                    <p
                      className="text-[12px] font-medium"
                      style={{ color: "var(--ink-secondary)" }}
                    >
                      {label}
                    </p>
                    {items.length > 0 && (
                      <button
                        type="button"
                        onClick={() => {
                          addSectionItem(key);
                          setTimeout(() => {
                            const section = document.querySelector(
                              `[data-section="${key}"]`
                            );
                            const inputs =
                              section?.querySelectorAll("input");
                            inputs?.[inputs.length - 1]?.focus();
                          }, 0);
                        }}
                        className="text-[12px] leading-none"
                        style={{ color: "var(--ink-tertiary)" }}
                      >
                        +
                      </button>
                    )}
                  </div>
                  {!hasItems && items.length === 0 && (
                    <p
                      className="text-[13px] cursor-text"
                      style={{
                        color: "var(--ink-tertiary)",
                        borderBottom: "1px dashed var(--line-subtle)",
                        paddingBottom: "4px",
                        display: "inline-block",
                      }}
                      onClick={() => addSectionItem(key)}
                    >
                      {emptyHint}
                    </p>
                  )}
                  <div className="space-y-0.5" data-section={key}>
                    {items.map((a, i) => (
                      <div
                        key={i}
                        className="flex gap-2 items-center group"
                      >
                        <span
                          className="text-[10px] mt-px shrink-0"
                          style={{ color: "var(--ink-tertiary)" }}
                        >
                          ·
                        </span>
                        <input
                          value={a}
                          onChange={(e) =>
                            updateSectionItem(key, i, e.target.value)
                          }
                          onKeyDown={(e) => {
                            if (e.key === "Enter") {
                              e.preventDefault();
                              addSectionItem(key);
                              setTimeout(() => {
                                const container =
                                  e.currentTarget.closest(".space-y-0\\.5");
                                const inputs =
                                  container?.querySelectorAll("input");
                                inputs?.[inputs.length - 1]?.focus();
                              }, 0);
                            }
                            if (e.key === "Backspace" && a === "") {
                              e.preventDefault();
                              removeSectionItem(key, i);
                              if (i > 0) {
                                setTimeout(() => {
                                  const container =
                                    e.currentTarget?.closest(
                                      ".space-y-0\\.5"
                                    );
                                  const inputs =
                                    container?.querySelectorAll("input");
                                  inputs?.[i - 1]?.focus();
                                }, 0);
                              }
                            }
                          }}
                          className="keepsy-editable-field flex-1 bg-transparent outline-none text-[14px] py-0.5"
                          style={{
                            color: "var(--ink-primary)",
                            lineHeight: "1.5",
                          }}
                          placeholder={emptyHint}
                        />
                        <button
                          type="button"
                          onClick={() => removeSectionItem(key, i)}
                          className={`shrink-0 flex items-center justify-center w-7 h-7 rounded-full transition-opacity ${
                            a === ""
                              ? "opacity-100"
                              : "opacity-0 group-hover:opacity-100"
                          }`}
                          style={{
                            color: "var(--ink-secondary)",
                            fontSize: "15px",
                          }}
                          aria-label="Remove"
                        >
                          ×
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>

          {/* Show "+ materials" link when materials section is hidden (empty) */}
          {note.lesson_report.materials.length === 0 && (
            <button
              type="button"
              onClick={() => addSectionItem("materials")}
              className="text-[12px] mt-4"
              style={{ color: "var(--ink-tertiary)" }}
            >
              + materials
            </button>
          )}

          {nextLessonLabel && (
            <p
              className="mt-5 text-[12px]"
              style={{ color: "var(--ink-tertiary)" }}
            >
              next lesson: {nextLessonLabel}
            </p>
          )}
        </div>

        {error && (
          <p className="mt-3 text-[12px]" style={{ color: "var(--danger)" }}>
            {error}
          </p>
        )}
      </div>

      {/* ─── Bottom bar ─── */}
      <div
        className="fixed bottom-0 left-0 right-0 px-5 py-4 z-20"
        style={{
          backgroundColor: "var(--bg-canvas)",
          borderTop: "1px solid var(--line-subtle)",
        }}
      >
        <div className="max-w-lg w-full mx-auto">
          {sent ? (
            <div className="text-center py-1">
              <p
                className="text-[14px] font-medium"
                style={{ color: "var(--success)" }}
              >
                sent to {studentFirstName}
              </p>
            </div>
          ) : (
            <>
              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={handleSaveAndClose}
                  disabled={saving}
                  className="flex-1 h-11 text-[14px] font-semibold rounded-xl"
                  style={{
                    backgroundColor: "var(--accent)",
                    color: "#fff",
                    boxShadow: "var(--shadow-cta)",
                  }}
                >
                  {saving ? "saving..." : "save"}
                </button>
                <button
                  type="button"
                  onClick={() => setSendOpen(true)}
                  disabled={!hasCovered}
                  className="h-11 px-6 text-[14px] font-semibold rounded-xl"
                  style={{
                    backgroundColor: "transparent",
                    color: hasCovered ? "var(--ink-primary)" : "var(--ink-tertiary)",
                    border: `1px solid ${hasCovered ? "var(--line-strong)" : "var(--line-subtle)"}`,
                    cursor: hasCovered ? "pointer" : "default",
                  }}
                >
                  send to {studentFirstName}
                </button>
              </div>
              {!hasCovered && (
                <p
                  className="text-[11px] text-center mt-1.5"
                  style={{ color: "var(--ink-tertiary)" }}
                >
                  add what you covered to send
                </p>
              )}
            </>
          )}
        </div>
      </div>

      {/* ─── Action sheet overlay ─── */}
      {sendOpen && (
        <>
          <div
            className="fixed inset-0 z-30"
            style={{ backgroundColor: "rgba(0,0,0,0.3)" }}
            onClick={() => setSendOpen(false)}
          />
          <div
            className="fixed bottom-0 left-0 right-0 z-40 px-4 pb-6 pt-5"
            style={{
              backgroundColor: "var(--bg-canvas)",
              borderRadius: "20px 20px 0 0",
              boxShadow: "0 -8px 40px rgba(0,0,0,0.12)",
            }}
          >
            <div className="max-w-lg w-full mx-auto">
              {/* Drag handle */}
              <div className="flex justify-center mb-4">
                <div
                  className="w-10 h-1 rounded-full"
                  style={{ backgroundColor: "var(--line-strong)" }}
                />
              </div>

              {/* Action options */}
              <div
                className="rounded-xl overflow-hidden mb-3"
                style={{ border: "1px solid var(--line-subtle)" }}
              >
                {/* SMS option — opens native messages app */}
                {canSendSMS && (
                  <a
                    href={`sms:${studentPhone}${/iP(hone|ad|od)/.test(typeof navigator !== "undefined" ? navigator.userAgent : "") ? "&" : "?"}body=${encodeURIComponent(buildReportMessage())}`}
                    onClick={() => {
                      setSendOpen(false);
                      // Mark as sent in background
                      const teacherNotesArr = teacherNotes
                        .split("\n")
                        .map((s: string) => s.trim())
                        .filter(Boolean);
                      fetch(`/api/lessons/${lessonId}/note`, {
                        method: "PATCH",
                        headers: { "Content-Type": "application/json" },
                        body: JSON.stringify({
                          student_message: buildReportMessage(),
                          lesson_report: { ...note.lesson_report, teacher_notes: teacherNotesArr },
                        }),
                      })
                        .then(() => fetch(`/api/lessons/${lessonId}/mark-sent`, { method: "POST" }))
                        .then(() => { setSent(true); setTimeout(() => setSent(false), 3000); })
                        .catch(() => {});
                    }}
                    className="w-full flex items-center justify-between px-4 py-3 text-left"
                    style={{
                      backgroundColor: "var(--bg-surface)",
                      borderBottom: "1px solid var(--line-subtle)",
                      textDecoration: "none",
                    }}
                  >
                    <p
                      className="text-[14px] font-medium"
                      style={{ color: "var(--ink-primary)" }}
                    >
                      send via sms
                    </p>
                    <span
                      className="text-[13px]"
                      style={{ color: "var(--ink-tertiary)" }}
                    >
                      ›
                    </span>
                  </a>
                )}

                {/* Email option — opens mailto: with pre-filled content */}
                {canSendEmail && (
                  <a
                    href={`mailto:${studentEmail}?subject=${encodeURIComponent(`Lesson Summary – ${studentFirstName} · ${dateLabel}`)}&body=${encodeURIComponent(buildReportMessage())}`}
                    onClick={() => {
                      setSendOpen(false);
                      // Mark as sent in background
                      const teacherNotesArr = teacherNotes
                        .split("\n")
                        .map((s: string) => s.trim())
                        .filter(Boolean);
                      fetch(`/api/lessons/${lessonId}/note`, {
                        method: "PATCH",
                        headers: { "Content-Type": "application/json" },
                        body: JSON.stringify({
                          student_message: buildReportMessage(),
                          lesson_report: { ...note.lesson_report, teacher_notes: teacherNotesArr },
                        }),
                      })
                        .then(() => fetch(`/api/lessons/${lessonId}/mark-sent`, { method: "POST" }))
                        .then(() => { setSent(true); setTimeout(() => setSent(false), 3000); })
                        .catch(() => {});
                    }}
                    className="w-full flex items-center justify-between px-4 py-3 text-left"
                    style={{
                      backgroundColor: "var(--bg-surface)",
                      borderBottom: "1px solid var(--line-subtle)",
                      textDecoration: "none",
                    }}
                  >
                    <p
                      className="text-[14px] font-medium"
                      style={{ color: "var(--ink-primary)" }}
                    >
                      send via email
                    </p>
                    <span
                      className="text-[13px]"
                      style={{ color: "var(--ink-tertiary)" }}
                    >
                      ›
                    </span>
                  </a>
                )}

                {/* Copy */}
                <button
                  type="button"
                  onClick={() => {
                    handleCopyReport();
                    setSendOpen(false);
                  }}
                  className="w-full flex items-center justify-between px-4 py-3 text-left"
                  style={{
                    backgroundColor: "var(--bg-surface)",
                    borderBottom: "1px solid var(--line-subtle)",
                  }}
                >
                  <p
                    className="text-[14px] font-medium"
                    style={{ color: "var(--ink-primary)" }}
                  >
                    {copied ? "copied!" : "copy to clipboard"}
                  </p>
                  <span
                    className="text-[13px]"
                    style={{ color: "var(--ink-tertiary)" }}
                  >
                    ›
                  </span>
                </button>

                {/* PDF */}
                <button
                  type="button"
                  onClick={() => {
                    window.open(`/lessons/${lessonId}/report`, "_blank");
                    setSendOpen(false);
                  }}
                  className="w-full flex items-center justify-between px-4 py-3 text-left"
                  style={{ backgroundColor: "var(--bg-surface)" }}
                >
                  <p
                    className="text-[14px] font-medium"
                    style={{ color: "var(--ink-primary)" }}
                  >
                    export PDF
                  </p>
                  <span
                    className="text-[13px]"
                    style={{ color: "var(--ink-tertiary)" }}
                  >
                    ›
                  </span>
                </button>
              </div>

              {/* Cancel */}
              <button
                type="button"
                onClick={() => setSendOpen(false)}
                className="w-full py-3 text-[14px] font-medium rounded-xl"
                style={{
                  backgroundColor: "var(--bg-surface)",
                  color: "var(--ink-secondary)",
                  border: "1px solid var(--line-subtle)",
                }}
              >
                cancel
              </button>

              {error && (
                <p
                  className="mt-2 text-center text-[12px]"
                  style={{ color: "var(--danger)" }}
                >
                  {error}
                </p>
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
