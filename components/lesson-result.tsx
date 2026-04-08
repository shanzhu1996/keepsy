"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import type { GeneratedNote, LessonReport } from "@/lib/types";

interface LessonResultProps {
  lessonId: string;
  studentFirstName: string;
  initialNote: GeneratedNote;
  nextLessonLabel: string | null;
  onReRecord: () => void;
}

type ReportKey = keyof LessonReport;

const SECTIONS: { key: ReportKey; label: string }[] = [
  { key: "covered", label: "1. Covered Today" },
  { key: "teacher_notes", label: "2. Teacher's Notes" },
  { key: "assignments", label: "3. Assignments" },
  { key: "next_lesson_plan", label: "4. Next Lesson Plan" },
  { key: "materials", label: "5. Materials / Links" },
];

export default function LessonResult({
  lessonId,
  studentFirstName,
  initialNote,
  nextLessonLabel,
  onReRecord,
}: LessonResultProps) {
  const router = useRouter();
  const [note, setNote] = useState<GeneratedNote>(initialNote);
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [recordOpen, setRecordOpen] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [editing, setEditing] = useState(false);
  const messageRef = useRef<HTMLDivElement>(null);
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  function scheduleSave(next: GeneratedNote) {
    if (saveTimer.current) clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(() => {
      fetch(`/api/lessons/${lessonId}/note`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          student_message: next.student_message,
          lesson_report: next.lesson_report,
        }),
      }).catch(() => {});
    }, 600);
  }

  useEffect(() => {
    return () => {
      if (saveTimer.current) clearTimeout(saveTimer.current);
    };
  }, []);

  function updateMessage(text: string) {
    const next = { ...note, student_message: text };
    setNote(next);
    scheduleSave(next);
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

  async function handleCopy() {
    setError(null);
    const text = note.student_message.trim();
    if (!text) return;
    try {
      if (typeof navigator !== "undefined" && "vibrate" in navigator) {
        navigator.vibrate?.(10);
      }
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
      if (saveTimer.current) clearTimeout(saveTimer.current);
      await fetch(`/api/lessons/${lessonId}/note`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          student_message: note.student_message,
          lesson_report: note.lesson_report,
        }),
      });
      // Mark the lesson as sent so the Today card transitions to its sent state.
      fetch(`/api/lessons/${lessonId}/mark-sent`, { method: "POST" }).catch(() => {});
    } catch (e) {
      setError(e instanceof Error ? e.message : "Couldn't copy");
    }
  }

  function enterEdit() {
    setMenuOpen(false);
    setEditing(true);
    setTimeout(() => {
      messageRef.current?.focus();
      if (messageRef.current) {
        const range = document.createRange();
        range.selectNodeContents(messageRef.current);
        range.collapse(false);
        const sel = window.getSelection();
        sel?.removeAllRanges();
        sel?.addRange(range);
      }
    }, 0);
  }

  function handleReRecord() {
    setMenuOpen(false);
    onReRecord();
  }

  return (
    <div className="fixed inset-0 bg-[var(--bg-canvas)] flex flex-col z-[60] overflow-y-auto">
      {/* Header */}
      <header className="flex items-center justify-between px-4 py-3 sticky top-0 bg-[var(--bg-canvas)] z-10">
        <button
          type="button"
          onClick={() => router.back()}
          className="text-sm text-gray-500 hover:text-gray-900"
          aria-label="Back"
        >
          ←
        </button>
        <div className="text-center">
          <div
            className="text-[17px] font-semibold"
            style={{ color: "var(--ink-primary)", letterSpacing: "-0.01em" }}
          >
            {studentFirstName}
          </div>
          <div
            className="text-[11px] font-semibold uppercase mt-0.5"
            style={{ color: "var(--accent-ink)", letterSpacing: "0.08em" }}
          >
            Ready for {studentFirstName}
          </div>
        </div>
        <div className="w-6" />
      </header>

      {/* Body */}
      <div className="flex-1 px-5 pt-6 pb-4 max-w-lg w-full mx-auto">
        {/* Student message bubble */}
        <div className="flex flex-col items-start">
          <p
            className="text-[11px] font-semibold uppercase mb-2.5 ml-1"
            style={{ color: "var(--ink-tertiary)", letterSpacing: "0.08em" }}
          >
            Quick msg to {studentFirstName}
          </p>
          <div
            ref={messageRef}
            contentEditable={editing}
            suppressContentEditableWarning
            onBlur={() => setEditing(false)}
            onInput={(e) => updateMessage((e.target as HTMLDivElement).innerText)}
            className="text-[17px] px-5 py-4 whitespace-pre-wrap outline-none max-w-[90%]"
            style={{
              color: "var(--message-ink)",
              lineHeight: "1.52",
              letterSpacing: "-0.005em",
              fontWeight: 450,
              backgroundColor: "var(--message-bg)",
              borderRadius: "6px 22px 22px 22px",
              boxShadow: "var(--shadow-message)",
            }}
          >
            {note.student_message}
          </div>

          <div className="mt-4 ml-1 flex items-center gap-3">
            <button
              type="button"
              onClick={handleCopy}
              disabled={!note.student_message.trim()}
              className="px-3.5 h-9 text-[13px] font-semibold transition-colors disabled:opacity-40"
              style={{
                backgroundColor: copied ? "var(--success)" : "var(--accent)",
                color: "#fff",
                borderRadius: "var(--radius-chip)",
                boxShadow: "var(--shadow-cta)",
                letterSpacing: "-0.005em",
              }}
            >
              {copied ? "✓ Copied" : "Copy message"}
            </button>
            <div className="relative">
              <button
                type="button"
                onClick={() => setMenuOpen((v) => !v)}
                className="text-lg leading-none px-2 transition-colors"
                style={{ color: "var(--ink-tertiary)" }}
                aria-label="More actions"
              >
                ⋯
              </button>
              {menuOpen && (
                <div
                  className="absolute left-0 top-8 py-1 min-w-[140px] z-20"
                  style={{
                    backgroundColor: "var(--bg-surface)",
                    borderRadius: "var(--radius)",
                    boxShadow: "var(--shadow-popover)",
                  }}
                >
                  <button
                    type="button"
                    onClick={enterEdit}
                    className="w-full text-left px-3 py-2 text-[14px]"
                    style={{ color: "var(--ink-primary)" }}
                  >
                    Edit
                  </button>
                  <button
                    type="button"
                    onClick={handleReRecord}
                    className="w-full text-left px-3 py-2 text-[14px]"
                    style={{ color: "var(--ink-primary)" }}
                  >
                    Re-record
                  </button>
                </div>
              )}
            </div>
          </div>
          {error && (
            <p className="mt-2 ml-1 text-[12px]" style={{ color: "var(--danger)" }}>
              {error}
            </p>
          )}

          {nextLessonLabel && (
            <p
              className="mt-5 ml-1 text-[12px]"
              style={{ color: "var(--ink-secondary)" }}
            >
              Next lesson: {nextLessonLabel}
            </p>
          )}
        </div>

        {/* Lesson report — collapsed accordion */}
        <div className="mt-10 mb-4">
          <div className="flex items-center gap-3">
            <div className="flex-1 h-px" style={{ backgroundColor: "var(--line-subtle)" }} />
            <button
              type="button"
              onClick={() => setRecordOpen((v) => !v)}
              className="text-[11px] font-semibold uppercase"
              style={{ color: "var(--ink-tertiary)", letterSpacing: "0.08em" }}
            >
              Lesson report {recordOpen ? "▴" : "▾"}
            </button>
            <div className="flex-1 h-px" style={{ backgroundColor: "var(--line-subtle)" }} />
          </div>

          {recordOpen && (
            <div className="flex justify-end mt-3">
              <button
                type="button"
                onClick={() =>
                  window.open(`/lessons/${lessonId}/report`, "_blank")
                }
                className="text-[12px] font-semibold"
                style={{ color: "var(--accent-ink)" }}
              >
                ⬇ Export PDF
              </button>
            </div>
          )}

          {recordOpen && (
            <div className="mt-6 space-y-6 px-1">
              {SECTIONS.map(({ key, label }) => {
                const items = note.lesson_report[key];
                return (
                  <div key={key}>
                    <p
                      className="text-[11px] font-semibold uppercase mb-2"
                      style={{
                        color: "var(--ink-secondary)",
                        letterSpacing: "0.08em",
                      }}
                    >
                      {label}
                    </p>
                    {items.length === 0 && (
                      <p
                        className="text-[13px] italic"
                        style={{ color: "var(--ink-tertiary)" }}
                      >
                        —
                      </p>
                    )}
                    <div className="space-y-1.5">
                      {items.map((a, i) => (
                        <div
                          key={i}
                          className="flex gap-2.5 items-center text-[15px]"
                          style={{ color: "var(--ink-primary)" }}
                        >
                          <span style={{ color: "var(--ink-tertiary)" }}>•</span>
                          <input
                            value={a}
                            onChange={(e) =>
                              updateSectionItem(key, i, e.target.value)
                            }
                            className="flex-1 bg-transparent outline-none py-0.5"
                          />
                          <button
                            type="button"
                            onClick={() => removeSectionItem(key, i)}
                            className="text-[12px]"
                            style={{ color: "var(--ink-tertiary)" }}
                            aria-label="Remove"
                          >
                            ✕
                          </button>
                        </div>
                      ))}
                    </div>
                    <button
                      type="button"
                      onClick={() => addSectionItem(key)}
                      className="text-[12px] font-semibold mt-2.5"
                      style={{ color: "var(--accent-ink)" }}
                    >
                      + Add
                    </button>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

    </div>
  );
}
