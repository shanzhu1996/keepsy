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
        no lessons yet
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

  const finished = lessons.filter((l) => {
    const end = new Date(l.scheduled_at).getTime() + (l.duration_min ?? 60) * 60_000;
    return end <= now || l.status === "cancelled";
  });

  const visibleUpcoming = showAllUpcoming ? upcoming : upcoming.slice(0, UPCOMING_PREVIEW_COUNT);
  const hiddenUpcomingCount = upcoming.length - UPCOMING_PREVIEW_COUNT;

  return (
    <div className="mb-4">
      {/* ─── Timeline ─── */}
      {upcoming.length > 0 && (
        <div className="student-timeline">
          {visibleUpcoming.map((lesson, i) => {
            const isNext = i === 0;
            return (
              <div
                key={lesson.id}
                className={`student-timeline-node ${isNext ? "student-timeline-node--next" : ""}`}
              >
                <div className="flex items-baseline justify-between">
                  <div className="flex items-baseline gap-2">
                    <span
                      className="font-display-numerals"
                      style={{
                        fontSize: isNext ? "15px" : "13px",
                        fontWeight: isNext ? 600 : 400,
                        color: isNext ? "var(--ink-primary)" : "var(--ink-tertiary)",
                      }}
                    >
                      {formatShortDate(lesson.scheduled_at)}
                    </span>
                    <span
                      style={{
                        fontSize: isNext ? "14px" : "12px",
                        color: isNext ? "var(--ink-secondary)" : "var(--ink-tertiary)",
                      }}
                    >
                      {formatTime(lesson.scheduled_at)}
                    </span>
                    {isNext && (
                      <span style={{ fontSize: "12px", color: "var(--ink-tertiary)" }}>
                        · {lesson.duration_min ?? 60} min
                      </span>
                    )}
                  </div>
                </div>
              </div>
            );
          })}

          {/* Expand toggle inside timeline */}
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
                {showAllUpcoming ? "show less" : `+ ${hiddenUpcomingCount} more`}
                {" "}
                <span
                  style={{
                    display: "inline-block",
                    transition: "transform 0.2s",
                    transform: showAllUpcoming ? "rotate(90deg)" : "rotate(0deg)",
                  }}
                >
                  ›
                </span>
              </button>
            </div>
          )}
        </div>
      )}

      {/* ─── Finished ─── */}
      {finished.length > 0 && (
        <div className="mt-3">
          <button
            type="button"
            onClick={() => setShowFinished(!showFinished)}
            className="flex items-center gap-2 transition-colors"
            style={{ color: "var(--ink-secondary)", background: "none", border: "none", cursor: "pointer", padding: "4px 0" }}
          >
            <span style={{ fontSize: "12px", fontWeight: 500, letterSpacing: "0.03em" }}>
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
          </button>

          <div className="finished-collapse" data-open={showFinished ? "true" : "false"}>
            <div className="mt-2 space-y-1">
              {finished.map((lesson) => {
                const noteSnippet = extractNoteSnippet(lesson.raw_note);
                const hasRawNote = !!lesson.raw_note;
                const isCancelled = lesson.status === "cancelled";

                return (
                  <Link
                    key={lesson.id}
                    href={hasRawNote ? `/lessons/${lesson.id}/notes` : `/lessons/${lesson.id}/capture`}
                    className="block rounded-lg px-3 py-2 transition-colors"
                    style={{
                      backgroundColor: "var(--bg-surface)",
                      border: "1px solid var(--line-subtle)",
                    }}
                    onMouseEnter={(e) => (e.currentTarget.style.borderColor = "var(--line-strong)")}
                    onMouseLeave={(e) => (e.currentTarget.style.borderColor = "var(--line-subtle)")}
                  >
                    <div className="flex items-baseline justify-between">
                      <div className="flex items-baseline gap-2">
                        <span
                          className="font-display-numerals text-[13px] font-medium"
                          style={{
                            color: isCancelled ? "var(--ink-tertiary)" : "var(--ink-primary)",
                            textDecoration: isCancelled ? "line-through" : "none",
                          }}
                        >
                          {formatTime(lesson.scheduled_at)}
                        </span>
                        <span className="text-[12px]" style={{ color: "var(--ink-tertiary)" }}>
                          {formatShortDate(lesson.scheduled_at)}
                        </span>
                        {isCancelled && (
                          <span className="text-[11px]" style={{ color: "var(--ink-tertiary)" }}>· cancelled</span>
                        )}
                      </div>
                      <span className="text-[11px]" style={{ color: "var(--ink-tertiary)" }}>›</span>
                    </div>
                    {noteSnippet && !isCancelled && (
                      <p className="text-[12px] italic mt-0.5 truncate" style={{ color: "var(--ink-tertiary)" }}>
                        {noteSnippet}
                      </p>
                    )}
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
