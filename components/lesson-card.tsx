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
import type { Lesson, NoteStatus } from "@/lib/types";

interface LessonCardProps {
  lesson: Lesson;
  showStudent?: boolean;
  studentName?: string;
  onRefresh?: () => void;
}

function deriveNoteStatus(lesson: Lesson): NoteStatus {
  if (lesson.note_status) return lesson.note_status;
  if (lesson.student_summary_sent_at) return "sent";
  if (lesson.raw_note && lesson.raw_note.trim().length > 0) return "draft";
  return "not_started";
}

function countAssignments(lesson: Lesson): number {
  if (!lesson.raw_note) return 0;
  try {
    const parsed = JSON.parse(lesson.raw_note);
    const list =
      parsed?.lesson_report?.assignments ??
      parsed?.assignments ??
      [];
    if (Array.isArray(list)) {
      return list.filter(
        (a: unknown) => typeof a === "string" && a.trim().length > 0
      ).length;
    }
  } catch {
    /* legacy */
  }
  return 0;
}

export default function LessonCard({
  lesson,
  showStudent = true,
  studentName,
  onRefresh,
}: LessonCardProps) {
  const router = useRouter();
  const [showCancelDialog, setShowCancelDialog] = useState(false);
  const [showEditDialog, setShowEditDialog] = useState(false);
  const [loading, setLoading] = useState(false);
  const [sentEcho, setSentEcho] = useState<string | null>(null);

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

  const noteStatus = deriveNoteStatus(lesson);
  const displayName = lesson.student?.name ?? studentName ?? "Student";
  const assignmentsCount = countAssignments(lesson);

  useEffect(() => {
    if (noteStatus !== "sent" || typeof window === "undefined") return;
    try {
      const raw = sessionStorage.getItem(`keepsy:sent:${lesson.id}`);
      if (!raw) return;
      const { elapsed, at } = JSON.parse(raw) as { elapsed: number; at: number };
      if (Date.now() - at > 10_000) {
        sessionStorage.removeItem(`keepsy:sent:${lesson.id}`);
        return;
      }
      setSentEcho(`sent in ${elapsed}s`);
      const t = setTimeout(() => {
        setSentEcho(null);
        sessionStorage.removeItem(`keepsy:sent:${lesson.id}`);
      }, 4000);
      return () => clearTimeout(t);
    } catch {
      /* ignore */
    }
  }, [noteStatus, lesson.id]);

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

  function goCapture(mode: "voice" | "type") {
    router.push(`/lessons/${lesson.id}/capture${mode === "type" ? "?mode=type" : ""}`);
  }

  // --- CANCELLED state: simple faded row ---
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

  // --- SENT state: single-line receipt, recedes ---
  if (noteStatus === "sent") {
    const sentAt = lesson.student_summary_sent_at
      ? new Date(lesson.student_summary_sent_at).toLocaleTimeString([], {
          hour: "numeric",
          minute: "2-digit",
        })
      : null;
    return (
      <div
        className="px-4 py-2.5 flex items-baseline justify-between text-[13px]"
        style={{ color: "var(--ink-tertiary)" }}
      >
        <div className="flex items-baseline gap-2.5 min-w-0">
          <span
            className="tabular-nums font-semibold"
            style={{ color: "var(--ink-secondary)" }}
          >
            {time}
          </span>
          {showStudent && <span className="truncate">{displayName}</span>}
        </div>
        <div className="flex items-baseline gap-2 text-[12px]">
          <span style={{ color: "var(--success)" }}>
            ✓{sentAt ? ` ${sentAt}` : ""}
          </span>
          {sentEcho && <span className="italic">{sentEcho}</span>}
        </div>
      </div>
    );
  }

  // --- DRAFT state: 3-line task card, metadata only, no message content ---
  if (noteStatus === "draft") {
    const metaLine =
      assignmentsCount > 0
        ? `Draft · ${assignmentsCount} assignment${assignmentsCount === 1 ? "" : "s"}`
        : "Draft · ready";
    return (
      <>
        <button
          type="button"
          onClick={() => goCapture("voice")}
          className="w-full text-left px-4 py-5 transition-transform active:scale-[0.99]"
          style={{
            backgroundColor: "var(--accent-soft)",
            borderRadius: "var(--radius-card)",
            boxShadow: "var(--shadow-card)",
          }}
        >
          <div className="flex items-baseline justify-between gap-2">
            <div className="flex items-baseline gap-2.5 min-w-0">
              <span
                className="text-[17px] font-semibold tabular-nums"
                style={{ color: "var(--ink-primary)", letterSpacing: "-0.01em" }}
              >
                {time}
              </span>
              {showStudent && (
                <span
                  className="text-[15px] font-medium truncate"
                  style={{ color: "var(--ink-primary)" }}
                >
                  {displayName}
                </span>
              )}
            </div>
            <span
              className="text-sm leading-none"
              style={{ color: "var(--accent)" }}
              aria-label="draft"
            >
              ●
            </span>
          </div>

          <p
            className="text-[12px] mt-1.5 mb-4"
            style={{ color: "var(--ink-secondary)" }}
          >
            {metaLine}
          </p>

          <div
            className="w-full h-12 flex items-center justify-center text-[15px] font-semibold text-white"
            style={{
              backgroundColor: "var(--accent)",
              borderRadius: "var(--radius)",
              boxShadow: "var(--shadow-cta)",
              letterSpacing: "-0.005em",
            }}
          >
            Continue
          </div>
        </button>
        {renderSchedulingDialogs()}
      </>
    );
  }

  // --- NOT_STARTED state: task card, single "Start notes" CTA ---
  return (
    <>
      <div
        className="px-4 py-5"
        style={{
          backgroundColor: "var(--bg-surface)",
          borderRadius: "var(--radius-card)",
          boxShadow: "var(--shadow-card)",
        }}
      >
        <div className="flex items-baseline justify-between gap-2">
          <div className="flex items-baseline gap-2.5 min-w-0">
            <span
              className="text-[17px] font-semibold tabular-nums"
              style={{ color: "var(--ink-primary)", letterSpacing: "-0.01em" }}
            >
              {time}
            </span>
            {showStudent && (
              <span
                className="text-[15px] font-medium truncate"
                style={{ color: "var(--ink-primary)" }}
              >
                {displayName}
              </span>
            )}
          </div>
          <span
            style={{ color: "var(--ink-tertiary)" }}
            aria-label="not started"
            title="not started"
          >
            ◌
          </span>
        </div>

        <p
          className="text-[12px] mt-1.5 mb-4"
          style={{ color: "var(--ink-secondary)" }}
        >
          {lesson.duration_min ? `${lesson.duration_min} min` : "\u00A0"}
        </p>

        <Button
          className="w-full h-12 text-[15px] font-semibold"
          style={{
            backgroundColor: "var(--accent)",
            borderRadius: "var(--radius)",
            boxShadow: "var(--shadow-cta)",
            letterSpacing: "-0.005em",
          }}
          onClick={() => goCapture("voice")}
        >
          Start notes
        </Button>

        {lesson.status === "scheduled" && (
          <div
            className="flex gap-3 mt-4 pt-3"
            style={{ borderTop: "1px solid var(--line-subtle)" }}
          >
            <button
              type="button"
              className="text-[11px] transition-colors"
              style={{ color: "var(--ink-tertiary)" }}
              onClick={() => setShowCancelDialog(true)}
              disabled={loading}
            >
              Cancel lesson
            </button>
            <button
              type="button"
              className="text-[11px] transition-colors"
              style={{ color: "var(--ink-tertiary)" }}
              onClick={() => setShowEditDialog(true)}
              disabled={loading}
            >
              Edit time
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
