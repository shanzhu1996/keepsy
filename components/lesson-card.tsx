"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import CalendarPicker from "@/components/calendar-picker";
import TimePickerInput from "@/components/time-picker";
import type { Lesson } from "@/lib/types";

interface LessonCardProps {
  lesson: Lesson;
  showStudent?: boolean;
  studentName?: string;
  onRefresh?: () => void;
  isAnchor?: boolean;
  index?: number;
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
}: LessonCardProps) {
  const router = useRouter();
  const [showCancelDialog, setShowCancelDialog] = useState(false);
  const [showEditDialog, setShowEditDialog] = useState(false);
  const [loading, setLoading] = useState(false);
  const [nowTick, setNowTick] = useState<number>(() => Date.now());

  const lessonDate = new Date(lesson.scheduled_at);
  const [editDate, setEditDate] = useState(
    `${lessonDate.getFullYear()}-${String(lessonDate.getMonth() + 1).padStart(2, "0")}-${String(lessonDate.getDate()).padStart(2, "0")}`
  );
  const [editTime, setEditTime] = useState(
    `${String(lessonDate.getHours()).padStart(2, "0")}:${String(lessonDate.getMinutes()).padStart(2, "0")}`
  );
  const [editDuration, setEditDuration] = useState(String(lesson.duration_min ?? 60));
  const [editScope, setEditScope] = useState<"this" | "future">("this");

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

  function doRefresh() {
    router.refresh();
    onRefresh?.();
  }

  async function handleCancel(chargeForLesson: boolean) {
    setLoading(true);
    try {
      const res = await fetch("/api/lessons/cancel", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ lessonId: lesson.id, chargeForLesson }),
      });
      if (!res.ok) throw new Error("Failed to cancel");
      setShowCancelDialog(false);
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
    router.push(`/lessons/${lesson.id}/capture`);
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
            : "4px solid transparent",
          animationDelay: `${Math.min(index, 10) * 40}ms`,
        }}
      >
        {/* Row 1: time + badge */}
        <div className="flex items-center justify-between gap-3">
          <span
            className="tabular-nums"
            style={{
              fontSize: "24px",
              lineHeight: "30px",
              fontWeight: 600,
              letterSpacing: "-0.015em",
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

        {/* Row 3: text-style CTA — only after the lesson ends */}
        {timeStatus === "finished" && (() => {
          // finished + empty → accent/600 (primary action)
          // finished + noteExists → tertiary/500 (archival)
          const emphasize = !noteExists;
          return (
            <button
              type="button"
              className={`lesson-cta ${emphasize ? "lesson-cta-write" : "lesson-cta-view"}`}
              style={{
                marginTop: "14px",
                display: "inline-flex",
                alignItems: "center",
                gap: "4px",
                fontSize: "14px",
                lineHeight: "20px",
                letterSpacing: "-0.005em",
                color: emphasize ? "var(--accent-ink)" : "var(--ink-tertiary)",
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
    </>
  );

  function renderSchedulingDialogs() {
    return (
      <>
        <Dialog open={showCancelDialog} onOpenChange={setShowCancelDialog}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Cancel Lesson</DialogTitle>
            </DialogHeader>
            <p className="text-sm text-gray-600 mb-4">
              Should this cancellation count toward billing?
            </p>
            <div className="flex gap-2">
              <Button onClick={() => handleCancel(true)} disabled={loading}>
                Yes, charge
              </Button>
              <Button
                variant="outline"
                onClick={() => handleCancel(false)}
                disabled={loading}
              >
                No, don&apos;t charge
              </Button>
            </div>
          </DialogContent>
        </Dialog>

        <Dialog open={showEditDialog} onOpenChange={setShowEditDialog}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>Edit Lesson</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 pt-1">
              <div>
                <label className="text-sm font-medium text-gray-900 block mb-2">Date</label>
                <CalendarPicker value={editDate} onChange={setEditDate} />
              </div>
              <div>
                <label className="text-sm font-medium text-gray-900 block mb-2">Time</label>
                <TimePickerInput value={editTime} onChange={setEditTime} />
              </div>
              <div>
                <label className="text-sm font-medium text-gray-900 block mb-1">Duration (min)</label>
                <Input
                  type="number"
                  min="15"
                  step="15"
                  value={editDuration}
                  onChange={(e) => setEditDuration(e.target.value)}
                />
              </div>
              {lesson.recurrence_group_id && (
                <div>
                  <label className="text-sm font-medium text-gray-900 block mb-2">
                    Apply changes to
                  </label>
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() => setEditScope("this")}
                      className={`flex-1 py-2 rounded-md border text-sm font-medium transition-colors ${
                        editScope === "this"
                          ? "bg-amber-600 text-white border-amber-600"
                          : "bg-white text-gray-700 border-gray-200 hover:border-gray-400"
                      }`}
                    >
                      This lesson only
                    </button>
                    <button
                      type="button"
                      onClick={() => setEditScope("future")}
                      className={`flex-1 py-2 rounded-md border text-sm font-medium transition-colors ${
                        editScope === "future"
                          ? "bg-amber-600 text-white border-amber-600"
                          : "bg-white text-gray-700 border-gray-200 hover:border-gray-400"
                      }`}
                    >
                      This &amp; all future
                    </button>
                  </div>
                </div>
              )}
              <div className="flex gap-2 pt-1">
                <Button className="flex-1" onClick={handleUpdate} disabled={loading}>
                  {loading ? "Saving…" : "Save Changes"}
                </Button>
                <Button variant="outline" onClick={() => setShowEditDialog(false)}>
                  Cancel
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </>
    );
  }
}
