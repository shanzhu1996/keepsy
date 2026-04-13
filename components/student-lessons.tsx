"use client";

import { useState } from "react";
import Link from "next/link";
import type { Lesson } from "@/lib/types";
import { extractNoteSnippet } from "@/lib/note-utils";

interface StudentLessonsProps {
  lessons: Lesson[];
  studentName: string;
}

const UPCOMING_PREVIEW_COUNT = 4;

function formatTime(dateStr: string): string {
  return new Date(dateStr)
    .toLocaleTimeString([], { hour: "numeric", minute: "2-digit" })
    .toLowerCase();
}

function formatShortDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString([], {
    month: "short",
    day: "numeric",
  });
}

export default function StudentLessons({ lessons, studentName }: StudentLessonsProps) {
  const [showFinished, setShowFinished] = useState(false);
  const [showAllUpcoming, setShowAllUpcoming] = useState(false);

  if (lessons.length === 0) {
    return (
      <p className="text-sm py-4 font-display italic" style={{ color: "var(--ink-tertiary)" }}>
        no lessons yet — schedule one to get started
      </p>
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

  // Count finished without notes for the nudge
  const finishedWithoutNotes = finished.filter(
    (l) => l.status !== "cancelled" && !l.raw_note
  ).length;

  return (
    <div className="mb-4">
      {/* ─── Upcoming timeline ─── */}
      {upcoming.length > 0 && (
        <div className="student-timeline">
          {visibleUpcoming.map((lesson, i) => {
            const isNext = i === 0;
            return (
              <div
                key={lesson.id}
                className={`student-timeline-node ${isNext ? "student-timeline-node--next" : ""}`}
              >
                {isNext ? (
                  /* Next lesson — DOMINANT element */
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
                        style={{ fontSize: "20px", fontWeight: 600, color: "var(--accent-ink)", letterSpacing: "-0.01em" }}
                      >
                        {formatShortDate(lesson.scheduled_at)}
                      </span>
                      <span style={{ fontSize: "15px", fontWeight: 500, color: "var(--ink-primary)" }}>
                        {formatTime(lesson.scheduled_at)}
                      </span>
                      <span style={{ fontSize: "13px", color: "var(--ink-secondary)" }}>
                        · {lesson.duration_min ?? 60} min
                      </span>
                    </div>
                  </div>
                ) : (
                  /* Later lessons — subordinate but visible */
                  <div className="flex items-baseline gap-2">
                    <span
                      className="font-display-numerals"
                      style={{ fontSize: "13px", fontWeight: 500, color: "var(--ink-secondary)" }}
                    >
                      {formatShortDate(lesson.scheduled_at)}
                    </span>
                    <span style={{ fontSize: "12px", color: "var(--ink-tertiary)" }}>
                      {formatTime(lesson.scheduled_at)}
                    </span>
                  </div>
                )}
              </div>
            );
          })}

          {hiddenUpcomingCount > 0 && (
            <div className="student-timeline-node" style={{ padding: "4px 0" }}>
              <button
                type="button"
                onClick={() => setShowAllUpcoming(!showAllUpcoming)}
                style={{
                  fontSize: "12px",
                  fontWeight: 500,
                  color: "var(--ink-secondary)",
                  background: "none",
                  border: "none",
                  cursor: "pointer",
                  padding: 0,
                }}
              >
                {showAllUpcoming ? "show less" : `+ ${hiddenUpcomingCount} more ›`}
              </button>
            </div>
          )}
        </div>
      )}

      {/* ─── Finished — with notes nudge ─── */}
      {finished.length > 0 && (
        <div className="mt-4">
          <button
            type="button"
            onClick={() => setShowFinished(!showFinished)}
            className="flex items-center gap-2 transition-colors"
            style={{ color: "var(--ink-secondary)", background: "none", border: "none", cursor: "pointer", padding: "4px 0" }}
          >
            <span style={{ fontSize: "13px", fontWeight: 600, letterSpacing: "0.02em" }}>
              finished · {finished.length}
            </span>
            <span
              style={{
                display: "inline-block",
                transition: "transform 0.2s",
                transform: showFinished ? "rotate(90deg)" : "rotate(0deg)",
                fontSize: "12px",
              }}
            >
              ›
            </span>
            {/* Notes nudge — show how many lessons are missing notes */}
            {finishedWithoutNotes > 0 && !showFinished && (
              <span style={{ fontSize: "11px", color: "var(--accent-cool)", marginLeft: "4px" }}>
                {finishedWithoutNotes} {finishedWithoutNotes === 1 ? "needs" : "need"} notes
              </span>
            )}
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
                    className="flex items-center justify-between rounded-[10px] px-3 py-2.5 transition-colors group"
                    style={{
                      backgroundColor: "var(--bg-surface)",
                      border: "1px solid var(--line-subtle)",
                    }}
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
                          {formatShortDate(lesson.scheduled_at)}
                        </span>
                        <span className="text-[12px]" style={{ color: "var(--ink-tertiary)" }}>
                          {formatTime(lesson.scheduled_at)}
                        </span>
                        {isCancelled && (
                          <span className="text-[11px]" style={{ color: "var(--ink-tertiary)" }}>· cancelled</span>
                        )}
                      </div>
                      {noteSnippet && !isCancelled && (
                        <p className="text-[12px] italic mt-0.5 truncate" style={{ color: "var(--ink-tertiary)" }}>
                          {noteSnippet}
                        </p>
                      )}
                    </div>
                    {/* Action hint */}
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
