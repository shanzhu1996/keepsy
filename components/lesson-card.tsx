"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import CalendarPicker from "@/components/calendar-picker";
import TimePickerInput from "@/components/time-picker";
import type { Lesson } from "@/lib/types";
import { extractNoteSnippet } from "@/lib/note-utils";

interface LessonCardProps {
  lesson: Lesson;
  showStudent?: boolean;
  studentName?: string;
  onRefresh?: () => void;
  isAnchor?: boolean;
  index?: number;
  /** Sibling lessons used to surface time-overlap hints in the Edit dialog.
   *  Optional — when missing, the conflict hint silently degrades. */
  siblingLessons?: Lesson[];
}

type LessonTimeStatus = "upcoming" | "in_progress" | "finished";

function deriveTimeStatus(lesson: Lesson, now: number): LessonTimeStatus {
  const start = new Date(lesson.scheduled_at).getTime();
  const end = start + (lesson.duration_min ?? 60) * 60_000;
  if (now < start) return "upcoming";
  if (now < end) return "in_progress";
  return "finished";
}

function hasNotes(lesson: Lesson): boolean {
  return !!(lesson.raw_note && lesson.raw_note.trim().length > 0);
}

const BADGE_LABELS: Record<LessonTimeStatus, string> = {
  upcoming: "Upcoming",
  in_progress: "In progress",
  finished: "Finished",
};

export default function LessonCard({
  lesson,
  showStudent = true,
  studentName,
  onRefresh,
  isAnchor = false,
  index = 0,
  siblingLessons,
}: LessonCardProps) {
  const router = useRouter();
  const [showCancelDialog, setShowCancelDialog] = useState(false);
  const [showEditDialog, setShowEditDialog] = useState(false);
  const [loading, setLoading] = useState(false);
  const [cancelScope, setCancelScope] = useState<"this" | "future">("this");
  const [cancelCharge, setCancelCharge] = useState(false);
  const [nowTick, setNowTick] = useState<number>(() => Date.now());
  const [showNotesNudge, setShowNotesNudge] = useState(false);
  const [showPackageNudge, setShowPackageNudge] = useState(false);
  const [packageNudgeData, setPackageNudgeData] = useState<{
    studentName: string;
    studentId: string;
  } | null>(null);
  const [completing, setCompleting] = useState(false);
  const [completed, setCompleted] = useState(lesson.status === "completed");

  const lessonDate = new Date(lesson.scheduled_at);
  const [editDate, setEditDate] = useState(
    `${lessonDate.getFullYear()}-${String(lessonDate.getMonth() + 1).padStart(2, "0")}-${String(lessonDate.getDate()).padStart(2, "0")}`
  );
  const [editTime, setEditTime] = useState(
    `${String(lessonDate.getHours()).padStart(2, "0")}:${String(lessonDate.getMinutes()).padStart(2, "0")}`
  );
  const [editDuration, setEditDuration] = useState(String(lesson.duration_min ?? 60));
  const [editScope, setEditScope] = useState<"this" | "future">("this");
  const [showFullCalendarEdit, setShowFullCalendarEdit] = useState(false);
  const [showDurationCustomEdit, setShowDurationCustomEdit] = useState(false);
  const editDateStripRef = useRef<HTMLButtonElement>(null);

  // Auto-center the selected chip in the date strip when dialog opens or date changes.
  useEffect(() => {
    if (!showEditDialog || showFullCalendarEdit) return;
    requestAnimationFrame(() => {
      editDateStripRef.current?.scrollIntoView({
        inline: "center",
        block: "nearest",
        behavior: "smooth",
      });
    });
  }, [showEditDialog, editDate, showFullCalendarEdit]);

  // Conflict hint for Edit dialog — same overlap math as the New Lesson dialog,
  // but excludes the lesson being edited so it doesn't flag its own current slot.
  const editConflict = (() => {
    if (!siblingLessons || !editDate || !editTime) return null;
    const start = new Date(`${editDate}T${editTime}:00`).getTime();
    const end = start + (parseInt(editDuration) || 60) * 60_000;
    for (const l of siblingLessons) {
      if (l.id === lesson.id) continue;
      if (l.status === "cancelled") continue;
      const lStart = new Date(l.scheduled_at).getTime();
      const lEnd = lStart + (l.duration_min ?? 60) * 60_000;
      if (start < lEnd && end > lStart) return l;
    }
    return null;
  })();

  function handleEditKeyDown(e: React.KeyboardEvent<HTMLFormElement>) {
    if ((e.metaKey || e.ctrlKey) && e.key === "Enter") {
      e.preventDefault();
      e.currentTarget.requestSubmit();
    }
  }

  const time = lessonDate.toLocaleTimeString([], { hour: "numeric", minute: "2-digit" });

  const displayName = lesson.student?.name ?? studentName ?? "Student";
  const timeStatus = deriveTimeStatus(lesson, nowTick);
  const noteExists = hasNotes(lesson);
  const ctaLabel = noteExists ? "View notes" : "Write notes";
  const badgeLabel = BADGE_LABELS[timeStatus];

  useEffect(() => {
    const id = setInterval(() => setNowTick(Date.now()), 60_000);
    return () => clearInterval(id);
  }, []);

  // No longer showing a popup nudge — notes prompt is inline on the card

  function doRefresh() {
    router.refresh();
    onRefresh?.();
  }

  async function handleComplete() {
    setCompleting(true);
    try {
      const res = await fetch("/api/lessons/complete", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ lessonId: lesson.id }),
      });
      if (!res.ok) throw new Error("Failed");
      const data = await res.json();
      setCompleted(true);

      // Show package nudge if package is complete and no future lessons
      if (data.packageComplete && !data.hasFutureLessons) {
        setPackageNudgeData({
          studentName: data.studentName,
          studentId: data.studentId,
        });
        setShowPackageNudge(true);
      } else {
        doRefresh();
      }
    } catch {
      // silent — the lesson card will still show as finished
    } finally {
      setCompleting(false);
    }
  }

  async function handleCancel() {
    setLoading(true);
    try {
      const res = await fetch("/api/lessons/cancel", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          lessonId: lesson.id,
          chargeForLesson: cancelCharge,
          scope: cancelScope,
        }),
      });
      if (!res.ok) throw new Error("Failed to cancel");
      setShowCancelDialog(false);
      setCancelScope("this");
      setCancelCharge(false);
      doRefresh();
    } catch {
      alert("Failed to cancel lesson");
    } finally {
      setLoading(false);
    }
  }

  async function handleUpdate() {
    setLoading(true);
    try {
      const scheduledAt = new Date(`${editDate}T${editTime}:00`).toISOString();
      const res = await fetch("/api/lessons/update", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          lessonId: lesson.id,
          scheduledAt,
          durationMin: parseInt(editDuration) || lesson.duration_min,
          scope: editScope,
        }),
      });
      if (!res.ok) throw new Error("Failed to update");
      setShowEditDialog(false);
      doRefresh();
    } catch {
      alert("Failed to update lesson");
    } finally {
      setLoading(false);
    }
  }

  function goCapture() {
    // If notes already exist, go to view/edit; otherwise go to capture
    if (noteExists) {
      router.push(`/lessons/${lesson.id}/notes`);
    } else {
      router.push(`/lessons/${lesson.id}/capture`);
    }
  }

  // --- CANCELLED state: simple faded row (unchanged) ---
  if (lesson.status === "cancelled") {
    return (
      <div
        className="rounded-lg px-4 py-2.5 text-[13px] bg-transparent"
        style={{ color: "var(--ink-tertiary)" }}
      >
        <span className="tabular-nums">{time}</span> · {displayName} · cancelled
      </div>
    );
  }

  const showSecondary = lesson.status === "scheduled" && timeStatus === "upcoming";
  const isInProgress = timeStatus === "in_progress";
  const needsNotes = timeStatus === "finished" && !noteExists;
  const finishedWithNotes = timeStatus === "finished" && noteExists;
  const minsSinceStart = Math.max(
    0,
    Math.floor((nowTick - lessonDate.getTime()) / 60_000)
  );
  const durationLabel = isInProgress
    ? `started ${minsSinceStart} min ago`
    : lesson.duration_min
    ? `${lesson.duration_min} min`
    : null;

  return (
    <>
      <div
        className="lesson-card"
        style={{
          padding: "22px 22px 20px 22px",
          backgroundColor: isInProgress
            ? "var(--card-progress-tint)"
            : "var(--bg-surface)",
          borderRadius: "18px",
          boxShadow: isInProgress
            ? "0 2px 4px rgba(165, 82, 42, 0.06), 0 8px 20px -8px rgba(165, 82, 42, 0.18)"
            : "var(--shadow-card)",
          borderLeft: isAnchor || isInProgress
            ? "4px solid var(--accent)"
            : needsNotes
            ? "4px solid var(--accent-cool)"
            : finishedWithNotes
            ? "4px solid rgba(61, 90, 74, 0.28)"
            : "4px solid transparent",
          animationDelay: `${Math.min(index, 10) * 40}ms`,
        }}
      >
        {/* Row 1: time + badge */}
        <div className="flex items-center justify-between gap-3">
          <span
            className="font-display-numerals"
            style={{
              fontSize: "26px",
              lineHeight: "30px",
              fontWeight: 500,
              letterSpacing: "-0.005em",
              color: "var(--ink-primary)",
            }}
          >
            {time}
          </span>
          <span
            className="shrink-0"
            style={{
              fontSize: "14px",
              lineHeight: "18px",
              fontWeight: 500,
              letterSpacing: "0",
              color: "var(--ink-tertiary)",
              padding: 0,
            }}
          >
            {badgeLabel}
          </span>
        </div>

        {/* Row 2: student name (primary) + duration (muted) */}
        {(showStudent || durationLabel) && (
          <p
            className="truncate"
            style={{
              marginTop: "10px",
              letterSpacing: "-0.005em",
              color: "var(--ink-primary)",
            }}
          >
            {showStudent && (
              <span style={{ fontSize: "18px", fontWeight: 500, lineHeight: "24px" }}>
                {displayName}
              </span>
            )}
            {showStudent && durationLabel && (
              <span
                style={{
                  fontSize: "14px",
                  fontWeight: isInProgress ? 500 : 400,
                  color: isInProgress ? "var(--ink-primary)" : "var(--ink-secondary)",
                  marginLeft: "8px",
                }}
              >
                {durationLabel}
              </span>
            )}
            {!showStudent && durationLabel && (
              <span
                style={{
                  fontSize: "14px",
                  fontWeight: 400,
                  color: "var(--ink-secondary)",
                }}
              >
                {durationLabel}
              </span>
            )}
          </p>
        )}

        {/* Note snippet for finished lessons */}
        {timeStatus === "finished" && noteExists && (() => {
          const snippet = extractNoteSnippet(lesson.raw_note);
          if (!snippet) return null;
          return (
            <p
              className="text-[12px] italic mt-2 truncate"
              style={{ color: "var(--ink-tertiary)", lineHeight: 1.4 }}
              title={snippet}
            >
              {snippet}
            </p>
          );
        })()}

        {/* Row 3: actions for finished lessons */}
        {timeStatus === "finished" && (() => {
          const emphasize = !noteExists;
          return (
            <div style={{ marginTop: "14px", display: "flex", alignItems: "center", gap: "16px" }}>
              {/* Completed indicator */}
              <span style={{ fontSize: "12px", color: "var(--success)" }}>
                {completed ? "done ✓" : "completing…"}
              </span>
              {/* Write/view notes */}
              <button
                type="button"
                className={`lesson-cta ${emphasize ? "lesson-cta-write" : "lesson-cta-view"}`}
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: "4px",
                  fontSize: "14px",
                  lineHeight: "20px",
                  letterSpacing: "-0.005em",
                  color: emphasize ? "var(--accent-cool)" : "var(--ink-tertiary)",
                  fontWeight: emphasize ? 600 : 500,
                  background: "transparent",
                  border: "none",
                  padding: 0,
                }}
                onClick={goCapture}
              >
                <span style={{ textDecoration: "underline", textUnderlineOffset: "3px" }}>
                  {ctaLabel}
                </span>
              </button>
            </div>
          );
        })()}

        {/* Row 4: secondary actions */}
        {showSecondary && (
          <div className="flex items-center" style={{ marginTop: "18px", gap: "16px" }}>
            <button
              type="button"
              className="transition-colors"
              style={{
                fontSize: "13px",
                lineHeight: "18px",
                fontWeight: 400,
                color: "var(--ink-tertiary)",
              }}
              onMouseEnter={(e) =>
                (e.currentTarget.style.color = "var(--ink-secondary)")
              }
              onMouseLeave={(e) =>
                (e.currentTarget.style.color = "var(--ink-tertiary)")
              }
              onClick={() => setShowEditDialog(true)}
              disabled={loading}
            >
              Modify
            </button>
            <button
              type="button"
              className="transition-colors"
              style={{
                fontSize: "13px",
                lineHeight: "18px",
                fontWeight: 400,
                color: "var(--ink-tertiary)",
              }}
              onMouseEnter={(e) =>
                (e.currentTarget.style.color = "var(--ink-secondary)")
              }
              onMouseLeave={(e) =>
                (e.currentTarget.style.color = "var(--ink-tertiary)")
              }
              onClick={() => setShowCancelDialog(true)}
              disabled={loading}
            >
              Cancel
            </button>
          </div>
        )}
      </div>
      {renderSchedulingDialogs()}

      {/* Notes nudge removed — "Write notes" is always visible inline on finished cards */}

      {/* Package complete nudge */}
      {showPackageNudge && packageNudgeData && (
        <>
          <div
            className="fixed inset-0 z-30"
            style={{ backgroundColor: "rgba(0,0,0,0.3)" }}
            onClick={() => { setShowPackageNudge(false); doRefresh(); }}
          />
          <div
            className="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 z-40 w-[min(320px,calc(100vw-48px))] rounded-[var(--radius-card)] px-6 py-6"
            style={{
              backgroundColor: "var(--bg-surface)",
              boxShadow: "var(--shadow-popover)",
            }}
          >
            <h3
              className="font-display text-[22px] mb-2"
              style={{ color: "var(--ink-primary)", letterSpacing: "-0.01em" }}
            >
              package complete!
            </h3>
            <p
              className="text-[14px] leading-relaxed mb-5"
              style={{ color: "var(--ink-secondary)" }}
            >
              {packageNudgeData.studentName.split(" ")[0]} has finished their lessons. schedule the next batch?
            </p>
            <div className="flex gap-3">
              <button
                type="button"
                onClick={() => {
                  setShowPackageNudge(false);
                  router.push(`/today?addLesson=${packageNudgeData.studentId}`);
                }}
                className="flex-1 h-10 text-[14px] font-semibold rounded-[var(--radius)]"
                style={{
                  backgroundColor: "var(--accent)",
                  color: "#fff",
                  boxShadow: "var(--shadow-cta)",
                }}
              >
                + add next lessons
              </button>
              <button
                type="button"
                onClick={() => { setShowPackageNudge(false); doRefresh(); }}
                className="flex-1 h-10 text-[14px] font-medium rounded-[var(--radius)]"
                style={{
                  border: "1px solid var(--line-strong)",
                  color: "var(--ink-secondary)",
                  backgroundColor: "transparent",
                }}
              >
                skip
              </button>
            </div>
          </div>
        </>
      )}
    </>
  );

  function renderSchedulingDialogs() {
    const editMonthLabel = new Date(editDate + "T12:00:00").toLocaleDateString([], {
      month: "long",
      year:
        new Date(editDate + "T12:00:00").getFullYear() !== new Date().getFullYear()
          ? "numeric"
          : undefined,
    });

    const todayStr = (() => {
      const t = new Date();
      t.setHours(0, 0, 0, 0);
      return `${t.getFullYear()}-${String(t.getMonth() + 1).padStart(2, "0")}-${String(t.getDate()).padStart(2, "0")}`;
    })();

    const isPresetDuration = ["30", "45", "60", "90"].includes(editDuration);
    const isPastDate = editDate < todayStr;

    return (
      <>
        {/* ── Cancel dialog ── */}
        <Dialog open={showCancelDialog} onOpenChange={(open) => {
          setShowCancelDialog(open);
          if (!open) {
            setCancelScope("this");
            setCancelCharge(false);
          }
        }}>
          <DialogContent
            className="max-w-xs"
            style={{ padding: "20px 22px 22px 22px", gap: 0 }}
          >
            <DialogHeader style={{ marginBottom: 0 }}>
              <DialogTitle
                className="font-display"
                style={{
                  fontSize: "22px",
                  fontWeight: 400,
                  letterSpacing: "-0.01em",
                  textTransform: "lowercase",
                  color: "var(--ink-primary)",
                }}
              >
                cancel lesson
              </DialogTitle>
            </DialogHeader>

            {/* Lesson context */}
            <p style={{ fontSize: "13px", color: "var(--ink-tertiary)", marginTop: "4px" }}>
              {displayName} · {lessonDate.toLocaleDateString([], {
                weekday: "short",
                month: "short",
                day: "numeric",
              })} · {time.toLowerCase()}
            </p>

            {/* Scope chips — only when recurring */}
            {lesson.recurrence_group_id && (
              <div className="flex flex-wrap gap-1.5" style={{ marginTop: "16px" }}>
                {([
                  ["this", "this lesson"],
                  ["future", "this & all future"],
                ] as const).map(([val, label]) => {
                  const selected = cancelScope === val;
                  return (
                    <button
                      key={val}
                      type="button"
                      onClick={() => {
                        setCancelScope(val);
                        if (val === "future") setCancelCharge(false);
                      }}
                      className="transition-colors focus:outline-none focus-visible:ring-1 focus-visible:ring-amber-300/70"
                      style={{
                        padding: "7px 11px",
                        borderRadius: "10px",
                        fontSize: "13px",
                        fontWeight: 500,
                        border: selected
                          ? "1px solid var(--accent)"
                          : "1px solid var(--line-strong)",
                        backgroundColor: selected
                          ? "var(--accent-soft)"
                          : "var(--bg-surface)",
                        color: selected
                          ? "var(--accent-ink)"
                          : "var(--ink-primary)",
                      }}
                    >
                      {label}
                    </button>
                  );
                })}
              </div>
            )}

            {/* Future-cancel summary — shows day pattern + end date */}
            {cancelScope === "future" && lesson.recurrence_group_id && (() => {
              const futureLessons = (siblingLessons ?? [])
                .filter(
                  (l) =>
                    l.recurrence_group_id === lesson.recurrence_group_id &&
                    l.status === "scheduled" &&
                    new Date(l.scheduled_at).getTime() >= new Date(lesson.scheduled_at).getTime()
                )
                .sort((a, b) => new Date(a.scheduled_at).getTime() - new Date(b.scheduled_at).getTime());
              if (futureLessons.length < 2) return null;
              const dayName = new Date(lesson.scheduled_at).toLocaleDateString([], { weekday: "short" });
              const lastDate = new Date(futureLessons[futureLessons.length - 1].scheduled_at);
              const endLabel = lastDate.toLocaleDateString([], { month: "short", day: "numeric" });
              const rule = lesson.recurrence_rule ?? "";
              const intervalLabel =
                rule === "biweekly" ? `every other ${dayName}`
                : rule === "monthly" ? `monthly · ${dayName}`
                : rule === "every-3w" ? `every 3 wks · ${dayName}`
                : `every ${dayName}`;
              return (
                <p
                  className="font-display"
                  style={{
                    marginTop: "10px",
                    marginLeft: "2px",
                    fontSize: "12px",
                    fontStyle: "italic",
                    color: "var(--ink-tertiary)",
                    letterSpacing: "0.01em",
                  }}
                >
                  {futureLessons.length} lessons · {intervalLabel} · through {endLabel}
                </p>
              );
            })()}

            {/* Billing checkbox — only when billing enabled + single scope */}
            {lesson.student?.billing_enabled && cancelScope === "this" && (
              <label
                className="flex items-center gap-2.5 cursor-pointer select-none"
                style={{ marginTop: "14px" }}
              >
                <span
                  className="flex items-center justify-center shrink-0"
                  style={{
                    width: "18px",
                    height: "18px",
                    borderRadius: "5px",
                    border: cancelCharge
                      ? "1.5px solid var(--accent)"
                      : "1.5px solid var(--line-strong)",
                    backgroundColor: cancelCharge
                      ? "var(--accent)"
                      : "var(--bg-surface)",
                    transition: "all 120ms ease",
                  }}
                >
                  {cancelCharge && (
                    <svg width="11" height="11" viewBox="0 0 12 12" fill="none">
                      <path d="M2.5 6L5 8.5L9.5 3.5" stroke="#FFFFFF" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                  )}
                </span>
                <input
                  type="checkbox"
                  checked={cancelCharge}
                  onChange={(e) => setCancelCharge(e.target.checked)}
                  className="sr-only"
                />
                <span style={{ fontSize: "13px", fontWeight: 400, color: "var(--ink-secondary)" }}>
                  charge for this lesson
                  <span style={{ color: "var(--ink-tertiary)", marginLeft: "4px" }}>
                    (late cancel)
                  </span>
                </span>
              </label>
            )}

            {/* CTA — text-only underlined link */}
            <button
              type="button"
              onClick={handleCancel}
              disabled={loading}
              className="w-full transition-colors focus:outline-none focus-visible:ring-1 focus-visible:ring-amber-300/70"
              style={{
                marginTop: "20px",
                padding: "8px 16px",
                background: "transparent",
                border: "none",
                cursor: loading ? "not-allowed" : "pointer",
                opacity: loading ? 0.4 : 1,
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                justifyContent: "center",
                gap: "2px",
              }}
            >
              <span
                style={{
                  fontSize: "14px",
                  fontWeight: cancelScope === "future" ? 600 : 500,
                  color: "var(--ink-secondary)",
                  textDecoration: "underline",
                  textUnderlineOffset: "3px",
                  textDecorationColor: "rgba(107, 86, 68, 0.35)",
                  letterSpacing: "-0.005em",
                }}
              >
                {loading
                  ? "cancelling…"
                  : cancelScope === "future" && lesson.recurrence_group_id
                  ? (() => {
                      const futureCount = siblingLessons
                        ? siblingLessons.filter(
                            (l) =>
                              l.recurrence_group_id === lesson.recurrence_group_id &&
                              l.status === "scheduled" &&
                              new Date(l.scheduled_at).getTime() >= new Date(lesson.scheduled_at).getTime()
                          ).length
                        : 0;
                      return futureCount > 1
                        ? `cancel ${futureCount} lessons`
                        : "cancel all future lessons";
                    })()
                  : "cancel lesson"}
              </span>
              {!loading && cancelScope === "future" && lesson.recurrence_group_id && (
                <span style={{ fontSize: "11px", fontWeight: 400, color: "var(--ink-tertiary)" }}>
                  this can&apos;t be undone
                </span>
              )}
            </button>
          </DialogContent>
        </Dialog>

        {/* ── Edit dialog: ported to New Lesson dialog language ── */}
        <Dialog open={showEditDialog} onOpenChange={setShowEditDialog}>
          <DialogContent
            className="max-w-md"
            style={{
              display: "flex",
              flexDirection: "column",
              maxHeight: "88vh",
              overflow: "hidden",
              padding: 0,
              backgroundColor: "var(--bg-canvas)",
            }}
          >
            <form
              onSubmit={(e) => {
                e.preventDefault();
                handleUpdate();
              }}
              onKeyDown={handleEditKeyDown}
              style={{ display: "flex", flexDirection: "column", flex: "1 1 auto", minHeight: 0 }}
            >
              <DialogHeader style={{ padding: "20px 24px 8px 24px" }}>
                <DialogTitle
                  className="font-display"
                  style={{
                    fontSize: "24px",
                    fontWeight: 400,
                    letterSpacing: "-0.01em",
                    textTransform: "lowercase",
                    color: "var(--ink-primary)",
                  }}
                >
                  edit lesson
                </DialogTitle>
              </DialogHeader>

              {/* Scrollable body */}
              <div
                style={{
                  flex: "1 1 auto",
                  overflowY: "auto",
                  padding: "8px 24px 16px 24px",
                }}
              >
                {/* when section */}
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-baseline gap-2 min-w-0">
                      <label
                        style={{
                          fontSize: "12px",
                          fontWeight: 500,
                          color: "var(--ink-secondary)",
                          textTransform: "lowercase",
                          letterSpacing: "0.02em",
                        }}
                      >
                        when
                      </label>
                      <span
                        className="font-display"
                        style={{
                          fontSize: "13px",
                          fontStyle: "italic",
                          color: "var(--ink-tertiary)",
                          letterSpacing: "0.01em",
                        }}
                      >
                        {editMonthLabel}
                      </span>
                    </div>
                    <button
                      type="button"
                      onClick={() => setShowFullCalendarEdit((s) => !s)}
                      aria-label={showFullCalendarEdit ? "Close calendar" : "Open full calendar"}
                      className="transition-colors focus:outline-none focus-visible:ring-1 focus-visible:ring-amber-300/70"
                      style={{
                        display: "inline-flex",
                        alignItems: "center",
                        gap: "4px",
                        padding: "4px 8px",
                        borderRadius: "8px",
                        border: showFullCalendarEdit
                          ? "1px solid var(--accent)"
                          : "1px solid transparent",
                        backgroundColor: showFullCalendarEdit
                          ? "var(--accent-soft)"
                          : "transparent",
                        color: showFullCalendarEdit
                          ? "var(--accent-ink)"
                          : "var(--ink-tertiary)",
                        fontSize: "12px",
                        fontWeight: 500,
                        letterSpacing: "0.01em",
                      }}
                    >
                      <svg
                        width="13"
                        height="13"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        aria-hidden
                      >
                        <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
                        <line x1="16" y1="2" x2="16" y2="6" />
                        <line x1="8" y1="2" x2="8" y2="6" />
                        <line x1="3" y1="10" x2="21" y2="10" />
                      </svg>
                      {showFullCalendarEdit ? "close" : "calendar"}
                    </button>
                  </div>

                  {/* 15-day selection-centered date strip */}
                  {!showFullCalendarEdit && (
                    <div className="relative">
                      <div
                        className="flex gap-2 overflow-x-auto pb-1"
                        style={{
                          scrollbarWidth: "none",
                          WebkitOverflowScrolling: "touch",
                        }}
                      >
                        {(() => {
                          const sel = new Date(editDate + "T12:00:00");
                          sel.setHours(0, 0, 0, 0);
                          return Array.from({ length: 15 }, (_, i) => {
                            const offset = i - 7;
                            const d = new Date(sel);
                            d.setDate(d.getDate() + offset);
                            const iso = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
                            const isSelected = iso === editDate;
                            const isToday = iso === todayStr;
                            const isPast = iso < todayStr;
                            const weekday = d.toLocaleDateString([], { weekday: "short" });
                            const dayNum = d.getDate();
                            const border = isSelected
                              ? "1px solid var(--accent)"
                              : "1px solid var(--line-strong)";
                            const bg = isSelected ? "var(--accent-soft)" : "var(--bg-surface)";
                            const fg = isSelected
                              ? "var(--accent-ink)"
                              : "var(--ink-primary)";
                            return (
                              <button
                                key={iso}
                                ref={isSelected ? editDateStripRef : undefined}
                                type="button"
                                disabled={isPast}
                                onClick={() => setEditDate(iso)}
                                aria-label={isPast ? `${weekday} ${dayNum} (past, not selectable)` : undefined}
                                className="flex flex-col items-center justify-center transition-colors focus:outline-none focus-visible:ring-1 focus-visible:ring-amber-300/70"
                                style={{
                                  flex: "0 0 auto",
                                  width: "52px",
                                  height: "64px",
                                  borderRadius: "12px",
                                  border,
                                  backgroundColor: bg,
                                  color: fg,
                                  gap: "2px",
                                  opacity: isPast ? 0.32 : 1,
                                  cursor: isPast ? "not-allowed" : "pointer",
                                }}
                              >
                                <span
                                  style={{
                                    fontSize: "10px",
                                    fontWeight: 500,
                                    textTransform: "lowercase",
                                    letterSpacing: "0.04em",
                                    opacity: isSelected ? 0.7 : 0.55,
                                  }}
                                >
                                  {weekday.toLowerCase()}
                                </span>
                                <span
                                  className="font-display-numerals"
                                  style={{
                                    fontSize: "20px",
                                    fontWeight: 500,
                                    letterSpacing: "-0.01em",
                                    lineHeight: 1,
                                  }}
                                >
                                  {dayNum}
                                </span>
                              </button>
                            );
                          });
                        })()}
                      </div>
                      <div
                        aria-hidden
                        style={{
                          position: "absolute",
                          top: 0,
                          right: 0,
                          bottom: 0,
                          width: "32px",
                          pointerEvents: "none",
                          background:
                            "linear-gradient(to right, rgba(244, 237, 224, 0) 0%, var(--bg-canvas) 100%)",
                        }}
                      />
                    </div>
                  )}

                  {showFullCalendarEdit && (
                    <div className="mt-2">
                      <CalendarPicker
                        value={editDate}
                        onChange={(d) => setEditDate(d)}
                        compact
                      />
                    </div>
                  )}

                  {/* editorial italic connector */}
                  <div
                    className="font-display"
                    style={{
                      marginTop: "10px",
                      marginBottom: "4px",
                      marginLeft: "2px",
                      fontSize: "13px",
                      fontStyle: "italic",
                      color: "var(--ink-tertiary)",
                      letterSpacing: "0.01em",
                    }}
                  >
                    at
                  </div>
                  <TimePickerInput value={editTime} onChange={setEditTime} />

                  {editConflict && (
                    <div
                      style={{
                        marginTop: "8px",
                        fontSize: "12px",
                        color: "var(--accent-cool, #3d5a4a)",
                        opacity: 0.85,
                        display: "flex",
                        alignItems: "center",
                        gap: "6px",
                      }}
                    >
                      <span style={{ fontSize: "14px", lineHeight: 1 }}>◆</span>
                      <span>
                        overlaps with {editConflict.student?.name ?? "another lesson"} ·{" "}
                        {new Date(editConflict.scheduled_at)
                          .toLocaleTimeString([], {
                            hour: "numeric",
                            minute: "2-digit",
                          })
                          .toLowerCase()}
                      </span>
                    </div>
                  )}
                </div>

                {/* duration section */}
                <div style={{ marginTop: "20px" }}>
                  <label
                    className="block mb-2"
                    style={{
                      fontSize: "12px",
                      fontWeight: 500,
                      color: "var(--ink-secondary)",
                      textTransform: "lowercase",
                      letterSpacing: "0.02em",
                    }}
                  >
                    duration
                  </label>
                  <div className="flex flex-wrap gap-1.5">
                    {["30", "45", "60", "90"].map((d) => {
                      const selected = d === editDuration && isPresetDuration;
                      return (
                        <button
                          key={d}
                          type="button"
                          onClick={() => {
                            setEditDuration(d);
                            setShowDurationCustomEdit(false);
                          }}
                          className="transition-colors focus:outline-none focus-visible:ring-1 focus-visible:ring-amber-300/70"
                          style={{
                            padding: "8px 12px",
                            borderRadius: "10px",
                            fontSize: "14px",
                            fontWeight: 500,
                            border: selected
                              ? "1px solid var(--accent)"
                              : "1px solid var(--line-strong)",
                            backgroundColor: selected
                              ? "var(--accent-soft)"
                              : "var(--bg-surface)",
                            color: selected
                              ? "var(--accent-ink)"
                              : "var(--ink-primary)",
                          }}
                        >
                          {d} min
                        </button>
                      );
                    })}
                    {(() => {
                      const customActive = showDurationCustomEdit || !isPresetDuration;
                      return (
                        <button
                          type="button"
                          onClick={() => {
                            setShowDurationCustomEdit((s) => {
                              const next = !s;
                              if (next && isPresetDuration) {
                                setEditDuration("20");
                              }
                              return next;
                            });
                          }}
                          aria-label="Custom duration"
                          className="transition-colors focus:outline-none focus-visible:ring-1 focus-visible:ring-amber-300/70"
                          style={{
                            padding: "8px 12px",
                            borderRadius: "10px",
                            fontSize: "13px",
                            fontWeight: 500,
                            border: customActive
                              ? "1px solid var(--accent)"
                              : "1px solid var(--line-strong)",
                            backgroundColor: customActive
                              ? "var(--accent-soft)"
                              : "var(--bg-surface)",
                            color: customActive
                              ? "var(--accent-ink)"
                              : "var(--ink-secondary)",
                            lineHeight: 1,
                          }}
                        >
                          other
                        </button>
                      );
                    })()}
                  </div>

                  {(showDurationCustomEdit || !isPresetDuration) && (
                    <div className="mt-2 flex items-center gap-2">
                      <input
                        type="number"
                        min="5"
                        max="240"
                        step="5"
                        value={editDuration}
                        onChange={(e) => setEditDuration(e.target.value)}
                        className="font-display-numerals focus:outline-none focus-visible:ring-1 focus-visible:ring-amber-300/70"
                        style={{
                          padding: "6px 10px",
                          borderRadius: "8px",
                          fontSize: "14px",
                          width: "80px",
                          border: "1px solid var(--line-strong)",
                          backgroundColor: "var(--bg-canvas)",
                          color: "var(--ink-primary)",
                        }}
                      />
                      <span style={{ fontSize: "13px", color: "var(--ink-tertiary)" }}>
                        minutes
                      </span>
                    </div>
                  )}
                </div>

                {/* apply changes to — chip pair, only when recurring */}
                {lesson.recurrence_group_id && (
                  <div style={{ marginTop: "20px" }}>
                    <label
                      className="block mb-2"
                      style={{
                        fontSize: "12px",
                        fontWeight: 500,
                        color: "var(--ink-secondary)",
                        textTransform: "lowercase",
                        letterSpacing: "0.02em",
                      }}
                    >
                      apply changes to
                    </label>
                    <div className="flex flex-wrap gap-1.5">
                      {([
                        ["this", "this lesson"],
                        ["future", "this & future"],
                      ] as const).map(([val, label]) => {
                        const selected = editScope === val;
                        return (
                          <button
                            key={val}
                            type="button"
                            onClick={() => setEditScope(val)}
                            className="transition-colors focus:outline-none focus-visible:ring-1 focus-visible:ring-amber-300/70"
                            style={{
                              padding: "8px 12px",
                              borderRadius: "10px",
                              fontSize: "14px",
                              fontWeight: 500,
                              border: selected
                                ? "1px solid var(--accent)"
                                : "1px solid var(--line-strong)",
                              backgroundColor: selected
                                ? "var(--accent-soft)"
                                : "var(--bg-surface)",
                              color: selected
                                ? "var(--accent-ink)"
                                : "var(--ink-primary)",
                            }}
                          >
                            {label}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>

              {/* Sticky footer CTA */}
              <div
                style={{
                  flex: "0 0 auto",
                  padding: "14px 24px 20px 24px",
                  borderTop: "1px solid var(--line-strong)",
                  boxShadow: "0 -6px 12px -8px rgba(43,31,23,0.10)",
                  backgroundColor: "var(--bg-canvas)",
                }}
              >
                {isPastDate && (
                  <div
                    style={{
                      marginBottom: "8px",
                      fontSize: "12px",
                      color: "var(--accent-cool, #3d5a4a)",
                      opacity: 0.85,
                      display: "flex",
                      alignItems: "center",
                      gap: "6px",
                    }}
                  >
                    <span style={{ fontSize: "14px", lineHeight: 1 }}>◆</span>
                    <span>can&apos;t move a lesson to a past date</span>
                  </div>
                )}
                <button
                  type="submit"
                  disabled={loading || !editDate || !editTime || isPastDate}
                  className="w-full transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-amber-300/70"
                  style={{
                    minHeight: "52px",
                    padding: "8px 16px",
                    borderRadius: "12px",
                    backgroundColor: "var(--accent)",
                    color: "#FFFFFF",
                    fontWeight: 500,
                    letterSpacing: "-0.005em",
                    border: "none",
                    opacity: loading || !editDate || !editTime || isPastDate ? 0.4 : 1,
                    cursor:
                      loading || !editDate || !editTime || isPastDate
                        ? "not-allowed"
                        : "pointer",
                    display: "flex",
                    flexDirection: "column",
                    alignItems: "center",
                    justifyContent: "center",
                    gap: "2px",
                    lineHeight: 1.2,
                  }}
                >
                  <span style={{ fontSize: "16px" }}>
                    {loading ? "saving…" : "save changes"}
                  </span>
                  {!loading && editScope === "future" && lesson.recurrence_group_id && (
                    <span style={{ fontSize: "12px", fontWeight: 400, opacity: 0.75 }}>
                      applies to all future lessons
                    </span>
                  )}
                </button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </>
    );
  }
}
