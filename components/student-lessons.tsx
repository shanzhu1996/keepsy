"use client";

import { useState } from "react";
import Link from "next/link";
import type { Lesson } from "@/lib/types";
import { extractNoteSnippet } from "@/lib/note-utils";

interface StudentLessonsProps {
  lessons: Lesson[];
  studentName: string;
}

const UPCOMING_PREVIEW_COUNT = 5;

function formatTime(dateStr: string): string {
  return new Date(dateStr)
    .toLocaleTimeString([], { hour: "numeric", minute: "2-digit" })
    .toLowerCase();
}


/** Group lessons into runs by local date string, returning [dateKey, label, lessons][] */
function groupByDate(lessons: Lesson[]): { dateKey: string; label: string; lessons: Lesson[] }[] {
  const groups: { dateKey: string; label: string; lessons: Lesson[] }[] = [];
  for (const lesson of lessons) {
    const d = new Date(lesson.scheduled_at);
    const dateKey = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
    const label = d.toLocaleDateString([], {
      weekday: "short",
      month: "short",
      day: "numeric",
    });
    const last = groups[groups.length - 1];
    if (last && last.dateKey === dateKey) {
      last.lessons.push(lesson);
    } else {
      groups.push({ dateKey, label, lessons: [lesson] });
    }
  }
  return groups;
}

export default function StudentLessons({ lessons, studentName }: StudentLessonsProps) {
  const [showFinished, setShowFinished] = useState(false);
  const [showAllUpcoming, setShowAllUpcoming] = useState(false);

  if (lessons.length === 0) {
    return (
      <p
        className="text-sm py-4 font-display italic"
        style={{ color: "var(--ink-tertiary)" }}
      >
        no lessons yet
      </p>
    );
  }

  const now = Date.now();
  const upcoming = lessons
    .filter((l) => {
      const start = new Date(l.scheduled_at).getTime();
      const end = start + (l.duration_min ?? 60) * 60_000;
      return end > now && l.status !== "cancelled";
    })
    .sort((a, b) => new Date(a.scheduled_at).getTime() - new Date(b.scheduled_at).getTime());

  const finished = lessons.filter((l) => {
    const start = new Date(l.scheduled_at).getTime();
    const end = start + (l.duration_min ?? 60) * 60_000;
    return end <= now || l.status === "cancelled";
  });

  // For upcoming: show first N, collapse the rest
  const visibleUpcoming = showAllUpcoming ? upcoming : upcoming.slice(0, UPCOMING_PREVIEW_COUNT);
  const hiddenUpcomingCount = upcoming.length - UPCOMING_PREVIEW_COUNT;

  const upcomingByDate = groupByDate(visibleUpcoming);
  const finishedByDate = groupByDate(finished);

  function renderLessonRow(lesson: Lesson, context: "upcoming" | "finished") {

    if (context === "finished") {
      const noteSnippet = extractNoteSnippet(lesson.raw_note);
      const hasNotes = !!noteSnippet;
      const hasRawNote = !!lesson.raw_note;
      const isCancelled = lesson.status === "cancelled";

      return (
        <Link
          key={lesson.id}
          href={hasRawNote ? `/lessons/${lesson.id}/notes` : `/lessons/${lesson.id}/capture`}
          className="block rounded-lg transition-colors"
          style={{
            padding: "8px 12px",
            backgroundColor: "var(--bg-surface)",
            border: "1px solid var(--line-subtle)",
            marginBottom: "4px",
          }}
          onMouseEnter={(e) => (e.currentTarget.style.borderColor = "var(--line-strong)")}
          onMouseLeave={(e) => (e.currentTarget.style.borderColor = "var(--line-subtle)")}
        >
          <div className="flex items-center justify-between">
            <div className="flex items-baseline gap-2">
              <span
                className="font-display-numerals text-sm font-medium"
                style={{
                  color: isCancelled ? "var(--ink-tertiary)" : "var(--ink-primary)",
                  textDecoration: isCancelled ? "line-through" : "none",
                }}
              >
                {formatTime(lesson.scheduled_at)}
              </span>
              <span className="text-xs" style={{ color: "var(--ink-tertiary)" }}>
                {lesson.duration_min ?? 60} min
              </span>
              {isCancelled && (
                <span className="text-xs" style={{ color: "var(--ink-tertiary)" }}>
                  · cancelled
                </span>
              )}
            </div>
            <span className="text-xs" style={{ color: "var(--ink-tertiary)" }}>›</span>
          </div>
          {/* Teacher's notes snippet */}
          {hasNotes && !isCancelled && (
            <p
              className="text-xs italic mt-1 note-clamp"
              style={{ color: "var(--ink-tertiary)", lineHeight: 1.4 }}
              title={noteSnippet}
            >
              {noteSnippet}
            </p>
          )}
          {/* Nudge to add/view notes */}
          {!hasNotes && !isCancelled && (
            <p
              className="text-xs mt-1"
              style={{ color: "var(--accent-ink)", opacity: 0.45 }}
            >
              {hasRawNote ? "view notes" : "add notes"}
            </p>
          )}
        </Link>
      );
    }

    // Upcoming row
    return (
      <Link
        key={lesson.id}
        href={`/lessons/${lesson.id}/capture`}
        className="flex items-center justify-between py-2 px-3 rounded-lg transition-colors"
        style={{
          backgroundColor: "var(--bg-surface)",
          border: "1px solid var(--line-subtle)",
          marginBottom: "4px",
        }}
        onMouseEnter={(e) => (e.currentTarget.style.borderColor = "var(--line-strong)")}
        onMouseLeave={(e) => (e.currentTarget.style.borderColor = "var(--line-subtle)")}
      >
        <div className="flex items-baseline gap-2">
          <span
            className="font-display-numerals text-sm font-medium"
            style={{ color: "var(--ink-primary)" }}
          >
            {formatTime(lesson.scheduled_at)}
          </span>
          <span
            className="text-xs"
            style={{ color: "var(--ink-tertiary)" }}
          >
            {lesson.duration_min ?? 60} min
          </span>
        </div>
        <span
          className="text-xs"
          style={{ color: "var(--ink-tertiary)" }}
        >
          ›
        </span>
      </Link>
    );
  }

  return (
    <div className="mb-6">
      {/* ─── Upcoming — compact rows ─── */}
      {upcoming.length > 0 && (
        <div className="mb-3">
          <div>
            {upcomingByDate.map(({ dateKey, label, lessons: dateLessons }, gi) => (
              <div key={dateKey} style={{ marginTop: gi === 0 ? 0 : "2px" }}>
                <p
                  className="text-xs font-medium"
                  style={{
                    color: "var(--ink-tertiary)",
                    letterSpacing: "0.02em",
                    padding: "6px 0 4px",
                  }}
                >
                  {label}
                </p>
                {dateLessons.map((lesson) => renderLessonRow(lesson, "upcoming"))}
              </div>
            ))}
          </div>

          {/* Show more / less toggle */}
          {hiddenUpcomingCount > 0 && (
            <button
              type="button"
              onClick={() => setShowAllUpcoming(!showAllUpcoming)}
              className="w-full flex items-center gap-3 mt-4 transition-colors"
              style={{ color: "var(--ink-secondary)", padding: "4px 0", background: "none", border: "none", cursor: "pointer" }}
            >
              <span style={{ fontSize: "12px", fontWeight: 500, letterSpacing: "0.03em", whiteSpace: "nowrap" }}>
                {showAllUpcoming ? "show less" : `upcoming · ${hiddenUpcomingCount} more`}
                {" "}
                <span style={{ display: "inline-block", transition: "transform 0.2s", transform: showAllUpcoming ? "rotate(90deg)" : "rotate(0deg)", fontSize: "12px" }}>›</span>
              </span>
              <span className="flex-1" style={{ height: "1px", background: "var(--line-subtle)" }} />
            </button>
          )}
        </div>
      )}

      {/* ─── Finished — collapsible ─── */}
      {finished.length > 0 && (
        <div>
          <button
            type="button"
            onClick={() => setShowFinished(!showFinished)}
            className="w-full flex items-center gap-3 mt-4 transition-colors mb-2"
            style={{ color: "var(--ink-secondary)", padding: "4px 0", background: "none", border: "none", cursor: "pointer" }}
          >
            <span style={{ fontSize: "12px", fontWeight: 500, letterSpacing: "0.03em", whiteSpace: "nowrap" }}>
              finished · {finished.length}
              {" "}
              <span style={{ display: "inline-block", transition: "transform 0.2s", transform: showFinished ? "rotate(90deg)" : "rotate(0deg)", fontSize: "12px" }}>›</span>
            </span>
            <span className="flex-1" style={{ height: "1px", background: "var(--line-subtle)" }} />
          </button>

          <div
            className="finished-collapse"
            data-open={showFinished ? "true" : "false"}
          >
            <div>
              <div>
                {finishedByDate.map(({ dateKey, label, lessons: dateLessons }, gi) => (
                  <div key={dateKey} style={{ marginTop: gi === 0 ? 0 : "2px" }}>
                    <p
                      className="text-xs font-medium"
                      style={{
                        color: "var(--ink-tertiary)",
                        letterSpacing: "0.02em",
                        padding: "6px 0 4px",
                      }}
                    >
                      {label}
                    </p>
                    {dateLessons.map((lesson) => renderLessonRow(lesson, "finished"))}
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
