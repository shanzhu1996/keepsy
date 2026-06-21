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
  nextToRecord?: { id: string; name: string } | null;
  onReRecord: () => void;
}

type ReportKey = keyof LessonReport;

const REPORT_SECTIONS: { key: ReportKey; label: string; emptyHint: string; optional?: boolean }[] = [
  { key: "covered", label: "covered", emptyHint: "what you worked on" },
  { key: "assignments", label: "assignments", emptyHint: "what to practice" },
  { key: "next_lesson_plan", label: "next class", emptyHint: "what to focus on" },
  { key: "materials", label: "materials", emptyHint: "links, handouts, resources", optional: true },
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
  nextToRecord,
  onReRecord,
}: LessonResultProps) {
  const router = useRouter();
  const [note, setNote] = useState<GeneratedNote>(initialNote);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [sendOpen, setSendOpen] = useState(false);
  const [sent, setSent] = useState(false);
  const [copied, setCopied] = useState(false);
  const [showDetails, setShowDetails] = useState(false);
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // The outgoing message the teacher actually sends. null = "follow the
  // auto-composed summary"; once they type, it forks to their own wording.
  const [messageDraft, setMessageDraft] = useState<string | null>(null);
  const msgRef = useRef<HTMLTextAreaElement>(null);
  function autoResizeMsg() {
    const ta = msgRef.current;
    if (ta) {
      ta.style.height = "auto";
      ta.style.height = ta.scrollHeight + "px";
    }
  }

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

  // Keep the send-message box sized to its content, whether the teacher is
  // editing their own copy or the auto-composed summary is changing.
  useEffect(() => {
    autoResizeMsg();
  }, [messageDraft, note]);

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
          student_message: messageDraft ?? composeMessage(next.lesson_report),
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

  // Teacher edited the outgoing message directly — fork to their wording and
  // persist exactly what they typed (debounced).
  function updateMessage(text: string) {
    setMessageDraft(text);
    autoResizeMsg();
    if (saveTimer.current) clearTimeout(saveTimer.current);
    const teacherNotesArr = teacherNotes
      .split("\n")
      .map((s) => s.trim())
      .filter(Boolean);
    saveTimer.current = setTimeout(() => {
      fetch(`/api/lessons/${lessonId}/note`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          student_message: text,
          lesson_report: { ...note.lesson_report, teacher_notes: teacherNotesArr },
        }),
      }).catch(() => {});
    }, 600);
  }

  // Discard the teacher's manual edit and snap back to the auto-composed summary.
  function rebuildMessageFromDetails() {
    setMessageDraft(null);
    scheduleSave(note);
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
          student_message: outgoingMessage(),
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

  // Auto-compose a summary message from the structured bullets.
  function composeMessage(report: LessonReport): string {
    const parts: string[] = [];

    // Greeting
    parts.push(`Hi ${studentFirstName},`);
    parts.push("");
    parts.push("Great work today! Here's a summary of our lesson:");
    parts.push("");

    const covered = report.covered.filter(Boolean);
    if (covered.length) {
      parts.push("What we covered:");
      covered.forEach((c) => parts.push(`  • ${c}`));
      parts.push("");
    }

    const assignments = report.assignments.filter(Boolean);
    if (assignments.length) {
      parts.push("Assignments:");
      assignments.forEach((a) => parts.push(`  • ${a}`));
      parts.push("");
    }

    const nextPlan = report.next_lesson_plan.filter(Boolean);
    if (nextPlan.length) {
      parts.push("Next class:");
      nextPlan.forEach((n) => parts.push(`  • ${n}`));
      parts.push("");
    }

    const materials = report.materials.filter(Boolean);
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

  // What the teacher is about to send: their own edit if they made one,
  // otherwise the live auto-composed summary.
  function outgoingMessage(): string {
    return messageDraft ?? composeMessage(note.lesson_report);
  }

  async function handleCopyReport() {
    const text = outgoingMessage();
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
        student_message: outgoingMessage(),
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
  // Sendable when there's structured content OR the teacher wrote their own message.
  const canSend =
    hasCovered || (messageDraft !== null && messageDraft.trim().length > 0);

  const canSendSMS = !!studentPhone;
  const canSendEmail = !!studentEmail;
  const channelLabel = canSendSMS
    ? "text message"
    : canSendEmail
      ? "email"
      : "copy / PDF";

  if (sent) {
    return (
      <div className="fixed inset-0 bg-[var(--bg-canvas)] flex flex-col z-[60]">
        <div className="flex-1 flex flex-col items-center justify-center px-8 text-center">
          <div
            className="flex items-center justify-center"
            style={{
              width: "76px",
              height: "76px",
              borderRadius: "50%",
              backgroundColor: "#E2F0E5",
              color: "var(--success)",
            }}
          >
            <svg
              width="40"
              height="40"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.5"
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden="true"
            >
              <path d="M20 6 9 17l-5-5" />
            </svg>
          </div>
          <p
            className="font-display"
            style={{ fontSize: "25px", marginTop: "18px", color: "var(--ink-primary)" }}
          >
            Sent to {studentFirstName}
          </p>
          <p
            style={{ fontSize: "14px", color: "var(--ink-secondary)", marginTop: "7px" }}
          >
            Saved to {studentFirstName}&apos;s history
          </p>
        </div>

        <div className="px-6 pb-10 max-w-lg w-full mx-auto">
          {nextToRecord ? (
            <>
              <p
                className="text-[12px] font-semibold uppercase mb-2"
                style={{ color: "var(--ink-tertiary)", letterSpacing: "0.07em" }}
              >
                still to record
              </p>
              <a
                href={`/lessons/${nextToRecord.id}/capture`}
                className="flex items-center gap-3"
                style={{
                  backgroundColor: "var(--bg-surface)",
                  border: "1px solid var(--line-strong)",
                  borderLeft: "3px solid var(--accent)",
                  borderRadius: "14px",
                  padding: "13px 15px",
                  textDecoration: "none",
                }}
              >
                <div
                  style={{
                    width: "40px",
                    height: "40px",
                    borderRadius: "50%",
                    backgroundColor: "var(--accent-soft)",
                    color: "var(--accent-ink)",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    fontWeight: 500,
                    fontSize: "15px",
                  }}
                >
                  {(nextToRecord.name.trim()[0] ?? "?").toUpperCase()}
                </div>
                <div className="flex-1">
                  <p className="font-display" style={{ fontSize: "18px", color: "var(--ink-primary)" }}>
                    {nextToRecord.name}
                  </p>
                  <p style={{ fontSize: "12px", color: "var(--ink-secondary)" }}>
                    next up
                  </p>
                </div>
                <span
                  style={{
                    fontSize: "13px",
                    fontWeight: 600,
                    color: "var(--accent-ink)",
                    backgroundColor: "var(--accent-soft)",
                    border: "1px solid rgba(165, 82, 42, 0.14)",
                    borderRadius: "9px",
                    padding: "8px 14px",
                    whiteSpace: "nowrap",
                  }}
                >
                  Record
                </span>
              </a>
              <a
                href="/today"
                className="block text-center mt-4"
                style={{ fontSize: "14px", color: "var(--ink-secondary)" }}
              >
                Back to today
              </a>
            </>
          ) : (
            <a
              href="/today"
              className="block w-full text-center h-12 leading-[3rem] rounded-xl font-semibold"
              style={{
                backgroundColor: "var(--bg-surface)",
                color: "var(--ink-primary)",
                border: "1px solid var(--line-strong)",
                fontSize: "15px",
                textDecoration: "none",
              }}
            >
              All caught up — back to today
            </a>
          )}
        </div>
      </div>
    );
  }

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
        {/* ─── Message to send (hero, editable) ─── */}
        <div className="flex items-center justify-between mb-2">
          <h2
            className="text-[12px] font-semibold uppercase"
            style={{ color: "var(--accent-ink)", letterSpacing: "0.07em" }}
          >
            ready to send
          </h2>
          {messageDraft !== null ? (
            <button
              type="button"
              onClick={rebuildMessageFromDetails}
              className="text-[12px]"
              style={{ color: "var(--ink-tertiary)" }}
            >
              ↻ rebuild from details
            </button>
          ) : (
            <span className="text-[12px]" style={{ color: "var(--ink-tertiary)" }}>
              tap to edit
            </span>
          )}
        </div>
        <div
          style={{
            backgroundColor: "var(--message-bg)",
            borderRadius: "14px",
            padding: "15px 16px",
          }}
        >
          <textarea
            ref={msgRef}
            value={outgoingMessage()}
            onChange={(e) => updateMessage(e.target.value)}
            className="keepsy-editable-field w-full bg-transparent outline-none resize-none text-[14px] whitespace-pre-wrap"
            style={{ color: "var(--ink-primary)", lineHeight: 1.6, minHeight: "48px" }}
            aria-label="Message to send"
          />
          <p
            className="text-[12px] mt-3 pt-3"
            style={{
              color: "var(--ink-secondary)",
              borderTop: "1px solid rgba(0,0,0,0.06)",
            }}
          >
            to {studentFirstName} · via {channelLabel}
          </p>
        </div>

        {/* ─── The details (collapsible structured record) ─── */}
        <button
          type="button"
          onClick={() => setShowDetails((v) => !v)}
          className="w-full flex items-center gap-2 mt-5 mb-1 py-2"
          style={{ borderTop: "1px solid var(--line-subtle)" }}
        >
          <span
            className="text-[12px] font-semibold uppercase"
            style={{ color: "var(--ink-secondary)", letterSpacing: "0.07em" }}
          >
            the details
          </span>
          <span
            className="text-[12px]"
            style={{ color: "var(--ink-tertiary)" }}
          >
            saved to {studentFirstName}&apos;s history
          </span>
          <span
            className="ml-auto text-[13px]"
            style={{ color: "var(--ink-tertiary)" }}
          >
            {showDetails ? "▴" : "▾"}
          </span>
        </button>
        {showDetails && (
        <div className="pt-2">

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
        )}

        {/* ─── Private note (never sent) ─── */}
        <div
          className="mt-6 rounded-xl p-3"
          style={{
            backgroundColor: "var(--bg-surface)",
            border: "1px solid var(--line-subtle)",
          }}
        >
          <div className="flex items-center gap-1.5 mb-1.5">
            <svg
              width="12"
              height="12"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              style={{ color: "var(--ink-tertiary)" }}
              aria-hidden="true"
            >
              <rect x="3" y="11" width="18" height="11" rx="2" />
              <path d="M7 11V7a5 5 0 0 1 10 0v4" />
            </svg>
            <span
              className="text-[11px] font-semibold uppercase"
              style={{ color: "var(--ink-tertiary)", letterSpacing: "0.06em" }}
            >
              private · only you
            </span>
          </div>
          <textarea
            ref={notesRef}
            value={teacherNotes}
            onChange={(e) => {
              updateTeacherNotes(e.target.value);
              autoResize();
            }}
            placeholder="Things to remember, observations — never sent to the student."
            className="keepsy-editable-field w-full text-[14px] px-0 py-1 outline-none resize-none bg-transparent"
            style={{
              color: "var(--ink-primary)",
              lineHeight: "1.6",
              minHeight: "56px",
            }}
          />
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
              <button
                type="button"
                onClick={() => setSendOpen(true)}
                disabled={!canSend}
                className="w-full h-12 text-[15px] font-semibold rounded-xl"
                style={{
                  backgroundColor: canSend ? "var(--accent)" : "var(--bg-muted)",
                  color: canSend ? "#fff" : "var(--ink-tertiary)",
                  boxShadow: canSend ? "var(--shadow-cta)" : "none",
                  cursor: canSend ? "pointer" : "default",
                }}
              >
                Send to {studentFirstName}
              </button>
              <div className="flex justify-center items-center gap-2 mt-2">
                <span
                  className="text-[12px]"
                  style={{ color: "var(--ink-tertiary)" }}
                >
                  {canSend ? `via ${channelLabel}` : "add a message or what you covered to send"}
                </span>
                <span
                  className="text-[12px]"
                  style={{ color: "var(--line-strong)" }}
                >
                  ·
                </span>
                <button
                  type="button"
                  onClick={handleSaveAndClose}
                  disabled={saving}
                  className="text-[12px]"
                  style={{ color: "var(--accent-ink)" }}
                >
                  {saving ? "saving…" : "save & close"}
                </button>
              </div>
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
                    href={`sms:${studentPhone}${/iP(hone|ad|od)/.test(typeof navigator !== "undefined" ? navigator.userAgent : "") ? "&" : "?"}body=${encodeURIComponent(outgoingMessage())}`}
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
                          student_message: outgoingMessage(),
                          lesson_report: { ...note.lesson_report, teacher_notes: teacherNotesArr },
                        }),
                      })
                        .then(() => fetch(`/api/lessons/${lessonId}/mark-sent`, { method: "POST" }))
                        .then(() => { setSent(true); })
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
                    href={`mailto:${studentEmail}?subject=${encodeURIComponent(`Lesson Summary – ${studentFirstName} · ${dateLabel}`)}&body=${encodeURIComponent(outgoingMessage())}`}
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
                          student_message: outgoingMessage(),
                          lesson_report: { ...note.lesson_report, teacher_notes: teacherNotesArr },
                        }),
                      })
                        .then(() => fetch(`/api/lessons/${lessonId}/mark-sent`, { method: "POST" }))
                        .then(() => { setSent(true); })
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
