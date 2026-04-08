"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import NoteInput from "@/components/note-input";
import CalendarPicker from "@/components/calendar-picker";
import TimePickerInput from "@/components/time-picker";
import type { Lesson } from "@/lib/types";

interface LessonCardProps {
  lesson: Lesson;
  showStudent?: boolean;
  studentName?: string; // fallback when lesson.student isn't joined
  onRefresh?: () => void; // called after complete/cancel so client pages can re-fetch
}

// Inline status pill — avoids Tailwind v4 class-ordering conflicts
const STATUS_STYLES: Record<string, { bg: string; color: string }> = {
  scheduled: { bg: "#dbeafe", color: "#1e3a8a" },   // blue
  completed:  { bg: "#dcfce7", color: "#14532d" },   // green
  cancelled:  { bg: "#f3f4f6", color: "#4b5563" },   // gray
};

export default function LessonCard({
  lesson,
  showStudent = true,
  studentName,
  onRefresh,
}: LessonCardProps) {
  const router = useRouter();
  const [showCancelDialog, setShowCancelDialog] = useState(false);
  const [showNoteDialog, setShowNoteDialog] = useState(false);
  const [showEditDialog, setShowEditDialog] = useState(false);
  const [loading, setLoading] = useState(false);

  // Edit form state — pre-filled from the lesson
  const lessonDate = new Date(lesson.scheduled_at);
  const [editDate, setEditDate] = useState(
    `${lessonDate.getFullYear()}-${String(lessonDate.getMonth() + 1).padStart(2, "0")}-${String(lessonDate.getDate()).padStart(2, "0")}`
  );
  const [editTime, setEditTime] = useState(
    `${String(lessonDate.getHours()).padStart(2, "0")}:${String(lessonDate.getMinutes()).padStart(2, "0")}`
  );
  const [editDuration, setEditDuration] = useState(
    String(lesson.duration_min ?? 60)
  );
  const [editScope, setEditScope] = useState<"this" | "future">("this");

  const time = new Date(lesson.scheduled_at).toLocaleTimeString([], {
    hour: "numeric",
    minute: "2-digit",
  });
  const date = new Date(lesson.scheduled_at).toLocaleDateString([], {
    weekday: "short",
    month: "short",
    day: "numeric",
  });

  const isToday =
    new Date(lesson.scheduled_at).toDateString() === new Date().toDateString();

  function doRefresh() {
    router.refresh();
    onRefresh?.();
  }

  async function handleComplete() {
    setLoading(true);
    try {
      const res = await fetch("/api/lessons/complete", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ lessonId: lesson.id }),
      });
      if (!res.ok) throw new Error("Failed to complete");
      doRefresh();
      setShowNoteDialog(true);
    } catch {
      alert("Failed to complete lesson");
    } finally {
      setLoading(false);
    }
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

  const statusStyle = STATUS_STYLES[lesson.status] ?? STATUS_STYLES.scheduled;

  return (
    <>
      <div className={`border rounded-lg p-3 transition-colors ${
        lesson.status === "completed"
          ? "bg-gray-100 border-gray-300 opacity-60"
          : "bg-white hover:bg-gray-50"
      }`}>
        <div className="flex justify-between items-start">
          <div className="flex-1">
            {showStudent && lesson.student && (
              <p className="font-semibold">{lesson.student.name}</p>
            )}
            <p className="text-sm text-gray-600">
              {isToday ? `Today, ${time}` : `${date}, ${time}`}
            </p>
            {lesson.duration_min && (
              <p className="text-xs text-gray-400">
                {lesson.duration_min} min
              </p>
            )}
          </div>

          {/* Inline status pill — always readable */}
          <span
            style={{ backgroundColor: statusStyle.bg, color: statusStyle.color }}
            className="inline-flex items-center rounded-md px-2.5 py-0.5 text-xs font-semibold border border-transparent"
          >
            {lesson.status}
          </span>
        </div>

        {lesson.status === "scheduled" && (
          <div className="flex gap-2 mt-3 flex-wrap">
            <Button
              size="sm"
              onClick={handleComplete}
              disabled={loading}
            >
              Complete
            </Button>
            <Button
              size="sm"
              variant="outline"
              onClick={() => setShowCancelDialog(true)}
              disabled={loading}
            >
              Cancel
            </Button>
            <Button
              size="sm"
              variant="outline"
              onClick={() => setShowEditDialog(true)}
              disabled={loading}
            >
              Edit
            </Button>
          </div>
        )}

        {lesson.status === "completed" && !lesson.raw_note && (
          <Button
            size="sm"
            variant="outline"
            className="mt-2"
            onClick={() => setShowNoteDialog(true)}
          >
            Add Note
          </Button>
        )}

        {lesson.raw_note && (
          <button
            type="button"
            onClick={() => setShowNoteDialog(true)}
            className="text-xs text-gray-500 mt-2 line-clamp-2 hover:text-gray-700 cursor-pointer transition-all whitespace-pre-wrap text-left w-full"
            title="Click to edit notes"
          >
            {lesson.raw_note}
          </button>
        )}
      </div>

      {/* Cancel Dialog */}
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

      {/* Note Dialog */}
      <Dialog open={showNoteDialog} onOpenChange={setShowNoteDialog}>
        <DialogContent className="max-w-lg max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Lesson Notes</DialogTitle>
          </DialogHeader>
          <NoteInput
            lessonId={lesson.id}
            scheduledAt={lesson.scheduled_at}
            studentName={lesson.student?.name ?? studentName ?? "Student"}
            existingNote={lesson.raw_note}
            existingStudentSummary={lesson.student_summary}
            onSaved={() => {
              setShowNoteDialog(false);
              doRefresh();
            }}
            onClose={() => setShowNoteDialog(false)}
          />
        </DialogContent>
      </Dialog>

      {/* Edit Dialog */}
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
                {editScope === "future" && (
                  <p className="text-xs text-gray-500 mt-1">
                    Time and duration will be updated for all upcoming lessons in this series.
                  </p>
                )}
              </div>
            )}

            <div className="flex gap-2 pt-1">
              <Button
                className="flex-1"
                onClick={handleUpdate}
                disabled={loading}
              >
                {loading ? "Saving…" : "Save Changes"}
              </Button>
              <Button
                variant="outline"
                onClick={() => setShowEditDialog(false)}
              >
                Cancel
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
