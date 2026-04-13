"use client";

import { useState } from "react";
import Link from "next/link";
import type { Lesson } from "@/lib/types";
import { extractNoteSnippet } from "@/lib/note-utils";
import AddLessonButton from "@/components/add-lesson-button";

interface StudentLessonsProps {
  lessons: Lesson[];
  studentName: string;
  studentId: string;
  defaultDuration?: number;
  billingCycleLessons?: number | null;
}

const UPCOMING_PREVIEW_COUNT = 4;

function fmtTime(dateStr: string): string {
  return new Date(dateStr)
    .toLocaleTimeString([], { hour: "numeric", minute: "2-digit" })
    .toLowerCase();
}

function fmtDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString([], { month: "short", day: "numeric" });
}

export default function StudentLessons({
  lessons,
  studentName,
  studentId,
  defaultDuration,
  billingCycleLessons,
}: StudentLessonsProps) {
  const [showFinished, setShowFinished] = useState(false);
  const [showAllUpcoming, setShowAllUpcoming] = useState(false);

  if (lessons.length === 0) {
    return (
      <div className="text-center py-8">
        <p className="font-display text-[17px] italic" style={{ color: "var(--ink-tertiary)" }}>
          no lessons yet
        </p>
        <div className="mt-3">
          <AddLessonButton
            studentId={studentId}
            studentName={studentName}
            defaultDuration={defaultDuration}
            billingCycleLessons={billingCycleLessons}
          />
        </div>
      </div>
    );
  }

  const now = Date.now();
  const upcoming = lessons
    .filter((l) => {
      const end = new Date(l.scheduled_at).getTime() + (l.duration_min ?? 60) * 60_000;
      return end > now && l.status !== "cancelled";
    })
    .sort((a, b) => new Date(a.scheduled_at).getTime() - new Date(b.scheduled_at).getTime());

  const finished = lessons
    .filter((l) => {
      const end = new Date(l.scheduled_at).getTime() + (l.duration_min ?? 60) * 60_000;
      return end <= now || l.status === "cancelled";
    })
    .sort((a, b) => new Date(b.scheduled_at).getTime() - new Date(a.scheduled_at).getTime());

  const visibleUpcoming = showAllUpcoming ? upcoming : upcoming.slice(0, UPCOMING_PREVIEW_COUNT);
  const hiddenUpcomingCount = upcoming.length - UPCOMING_PREVIEW_COUNT;
  const finishedWithoutNotes = finished.filter((l) => l.status !== "cancelled" && !l.raw_note).length;

  return (
    <div>
      {/* ── Upcoming timeline ── */}
      {upcoming.length > 0 && (
        <div className="student-timeline mb-4">
          {visibleUpcoming.map((lesson, i) => {
            const isNext = i === 0;
            return (
              <div
                key={lesson.id}
                className={`student-timeline-node ${isNext ? "student-timeline-node--next" : ""}`}
              >
                {isNext ? (
                  <div
                    className="px-4 py-3 rounded-[12px] -ml-4"
                    style={{
                      backgroundColor: "var(--accent-soft)",
                      borderLeft: "3px solid var(--accent)",
                    }}
                  >
                    <div className="flex items-baseline gap-2 flex-wrap">
                      <span
                        className="font-display-numerals"
                        style={{ fontSize: "18px", fontWeight: 600, color: "var(--accent-ink)", letterSpacing: "-0.01em" }}
                      >
                        {fmtDate(lesson.scheduled_at)}
                      </span>
                      <span
                        className="font-display-numerals"
                        style={{ fontSize: "15px", fontWeight: 500, color: "var(--ink-primary)" }}
                      >
                        {fmtTime(lesson.scheduled_at)}
                      </span>
                      <span style={{ fontSize: "13px", color: "var(--ink-secondary)" }}>
                        · {lesson.duration_min ?? 60} min
                      </span>
                    </div>
                  </div>
                ) : (
                  <div className="flex items-baseline gap-2">
                    <span className="font-display-numerals" style={{ fontSize: "13px", fontWeight: 500, color: "var(--ink-secondary)" }}>
                      {fmtDate(lesson.scheduled_at)}
                    </span>
                    <span style={{ fontSize: "12px", color: "var(--ink-tertiary)" }}>
                      {fmtTime(lesson.scheduled_at)}
                    </span>
                  </div>
                )}
              </div>
            );
          })}

          {hiddenUpcomingCount > 0 && (
            <div className="student-timeline-node" style={{ padding: "3px 0" }}>
              <button
                type="button"
                onClick={() => setShowAllUpcoming(!showAllUpcoming)}
                style={{ fontSize: "12px", fontWeight: 500, color: "var(--ink-secondary)", background: "none", border: "none", cursor: "pointer", padding: 0 }}
              >
                {showAllUpcoming ? "show less" : `+ ${hiddenUpcomingCount} more ›`}
              </button>
            </div>
          )}
        </div>
      )}

      {/* ── Finished header row — matches Today's "NOW" / "UP NEXT" label style ── */}
      <div className="flex items-center gap-3 mt-2 mb-3">
        <span
          style={{
            fontSize: "11px",
            fontWeight: 600,
            letterSpacing: "0.08em",
            textTransform: "uppercase" as const,
            color: "var(--ink-tertiary)",
          }}
        >
          finished · {finished.length}
          {finishedWithoutNotes > 0 && (
            <span style={{ color: "var(--accent-cool)", marginLeft: "8px", fontWeight: 600 }}>
              {finishedWithoutNotes} {finishedWithoutNotes === 1 ? "needs" : "need"} notes
            </span>
          )}
        </span>
        <span className="flex-1" style={{ height: "1px", background: "var(--line-subtle)" }} />
        <AddLessonButton
          studentId={studentId}
          studentName={studentName}
          defaultDuration={defaultDuration}
          billingCycleLessons={billingCycleLessons}
        />
      </div>

      {/* ── Finished lessons (collapsed) ── */}
      {finished.length > 0 && (
        <div>
          <button
            type="button"
            onClick={() => setShowFinished(!showFinished)}
            style={{ fontSize: "12px", fontWeight: 500, color: "var(--ink-secondary)", background: "none", border: "none", cursor: "pointer", padding: "2px 0" }}
          >
            {showFinished ? "hide" : "show"} finished lessons
            <span style={{ marginLeft: "4px", display: "inline-block", transition: "transform 0.2s", transform: showFinished ? "rotate(90deg)" : "rotate(0deg)" }}>›</span>
          </button>

          <div className="finished-collapse" data-open={showFinished ? "true" : "false"}>
            <div className="mt-2 space-y-1.5">
              {finished.map((lesson) => {
                const noteSnippet = extractNoteSnippet(lesson.raw_note);
                const hasRawNote = !!lesson.raw_note;
                const isCancelled = lesson.status === "cancelled";

                return (
                  <Link
                    key={lesson.id}
                    href={hasRawNote ? `/lessons/${lesson.id}/notes` : `/lessons/${lesson.id}/capture`}
                    className="flex items-center justify-between rounded-[10px] px-3 py-2.5 transition-colors"
                    style={{ backgroundColor: "var(--bg-surface)", border: "1px solid var(--line-subtle)" }}
                    onMouseEnter={(e) => (e.currentTarget.style.borderColor = "var(--line-strong)")}
                    onMouseLeave={(e) => (e.currentTarget.style.borderColor = "var(--line-subtle)")}
                  >
                    <div className="min-w-0 flex-1">
                      <div className="flex items-baseline gap-2">
                        <span
                          className="font-display-numerals text-[13px] font-medium"
                          style={{
                            color: isCancelled ? "var(--ink-tertiary)" : "var(--ink-primary)",
                            textDecoration: isCancelled ? "line-through" : "none",
                          }}
                        >
                          {fmtDate(lesson.scheduled_at)}
                        </span>
                        <span className="text-[12px]" style={{ color: "var(--ink-tertiary)" }}>
                          {fmtTime(lesson.scheduled_at)}
                        </span>
                        {isCancelled && <span className="text-[11px]" style={{ color: "var(--ink-tertiary)" }}>· cancelled</span>}
                      </div>
                      {noteSnippet && !isCancelled && (
                        <p className="text-[12px] italic mt-0.5 truncate" style={{ color: "var(--ink-tertiary)" }}>{noteSnippet}</p>
                      )}
                    </div>
                    <span
                      className="text-[12px] font-medium flex-shrink-0 ml-3"
                      style={{
                        color: hasRawNote ? "var(--ink-tertiary)" : "var(--accent-cool)",
                        fontWeight: hasRawNote ? 400 : 600,
                      }}
                    >
                      {isCancelled ? "" : hasRawNote ? "view notes ›" : "write notes ›"}
                    </span>
                  </Link>
                );
              })}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
