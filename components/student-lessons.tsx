"use client";

import { useState } from "react";
import Link from "next/link";
import type { Lesson } from "@/lib/types";
import { extractNoteSnippet } from "@/lib/note-utils";

interface StudentLessonsProps {
  lessons: Lesson[];
  studentName: string;
  studentId: string;
  defaultDuration?: number;
  billingCycleLessons?: number | null;
}

const UPCOMING_PREVIEW_COUNT = 4;

function fmtWeekdayDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString([], {
    weekday: "short",
    month: "short",
    day: "numeric",
  });
}

function fmtTime(dateStr: string): string {
  return new Date(dateStr)
    .toLocaleTimeString([], { hour: "numeric", minute: "2-digit" })
    .toLowerCase();
}

export default function StudentLessons({
  lessons,
  studentName,
  studentId,
}: StudentLessonsProps) {
  const [showFinished, setShowFinished] = useState(false);
  const [showAllUpcoming, setShowAllUpcoming] = useState(false);
  const [expandedId, setExpandedId] = useState<string | null>(null);

  if (lessons.length === 0) {
    return (
      <p className="font-display text-[15px] italic py-6" style={{ color: "var(--ink-tertiary)" }}>
        no lessons yet — add one to get started
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
  const finishedWithoutNotes = finished.filter((l) => l.status !== "cancelled" && !l.raw_note).length;

  return (
    <div>
      {/* ── Upcoming timeline ── */}
      {upcoming.length > 0 && (
        <div className="mb-4">
          <div className="flex items-center gap-2 mb-3">
            <span
              style={{
                fontSize: "11px",
                fontWeight: 600,
                letterSpacing: "0.06em",
                textTransform: "uppercase" as const,
                color: "var(--ink-tertiary)",
              }}
            >
              Upcoming · {upcoming.length}
            </span>
          </div>
          <div className="student-timeline">
          {visibleUpcoming.map((lesson, i) => {
            const isNext = i === 0;
            const isExpanded = expandedId === lesson.id;

            return (
              <div
                key={lesson.id}
                className={`student-timeline-node ${isNext ? "student-timeline-node--next" : ""}`}
              >
                <div
                  className="timeline-row"
                  data-expanded={isExpanded}
                  onClick={() => setExpandedId(isExpanded ? null : lesson.id)}
                >
                  <div className="flex items-baseline justify-between">
                    <div className="flex items-baseline gap-1.5 flex-wrap">
                      <span
                        className="font-display-numerals"
                        style={{
                          fontSize: isNext ? "16px" : "13px",
                          fontWeight: isNext ? 600 : 500,
                          color: isNext ? "var(--ink-primary)" : "var(--ink-secondary)",
                          letterSpacing: "-0.01em",
                        }}
                      >
                        {fmtWeekdayDate(lesson.scheduled_at)}
                      </span>
                      <span
                        style={{
                          fontSize: isNext ? "14px" : "12px",
                          color: isNext ? "var(--ink-secondary)" : "var(--ink-tertiary)",
                        }}
                      >
                        · {fmtTime(lesson.scheduled_at)}
                      </span>
                      {isNext && (
                        <span style={{ fontSize: "12px", color: "var(--ink-tertiary)" }}>
                          · {lesson.duration_min ?? 60} min
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Actions — visible on hover (desktop) or tap (mobile) */}
                  <div
                    className="timeline-row-actions"
                    style={{ gap: "12px", marginTop: "4px", paddingBottom: "2px" }}
                  >
                    <Link
                      href="/today"
                      className="text-[12px] transition-colors"
                      style={{ color: "var(--ink-tertiary)", textDecoration: "underline", textUnderlineOffset: "3px" }}
                      onClick={(e) => e.stopPropagation()}
                    >
                      modify
                    </Link>
                    <span className="text-[12px]" style={{ color: "var(--line-strong)" }}>·</span>
                    <button
                      type="button"
                      className="text-[12px] transition-colors"
                      style={{ color: "var(--ink-tertiary)", textDecoration: "underline", textUnderlineOffset: "3px", background: "none", border: "none", cursor: "pointer", padding: 0 }}
                      onClick={(e) => {
                        e.stopPropagation();
                        // TODO: inline cancel with confirmation
                      }}
                    >
                      cancel
                    </button>
                  </div>
                </div>
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
        </div>
      )}

      {/* ── Finished — label is the toggle ── */}
      {finished.length > 0 && (
        <div className="mt-3">
          <button
            type="button"
            onClick={() => setShowFinished(!showFinished)}
            className="flex items-center gap-2 transition-colors"
            style={{ background: "none", border: "none", cursor: "pointer", padding: "4px 0" }}
          >
            <span
              style={{
                fontSize: "11px",
                fontWeight: 600,
                letterSpacing: "0.06em",
                textTransform: "uppercase" as const,
                color: "var(--ink-tertiary)",
              }}
            >
              Finished · {finished.length}
            </span>
            {finishedWithoutNotes > 0 && (
              <span style={{ fontSize: "11px", fontWeight: 600, color: "var(--accent-cool)" }}>
                · {finishedWithoutNotes} {finishedWithoutNotes === 1 ? "needs" : "need"} notes
              </span>
            )}
            <span
              style={{
                display: "inline-block",
                transition: "transform 0.2s",
                transform: showFinished ? "rotate(90deg)" : "rotate(0deg)",
                fontSize: "12px",
                color: "var(--ink-tertiary)",
              }}
            >
              ›
            </span>
          </button>

          <div className="finished-collapse" data-open={showFinished ? "true" : "false"}>
            <div className="student-timeline--finished mt-2">
              {finished.map((lesson) => {
                const noteSnippet = extractNoteSnippet(lesson.raw_note);
                const hasRawNote = !!lesson.raw_note;
                const isCancelled = lesson.status === "cancelled";
                const needsNotes = !isCancelled && !hasRawNote;

                return (
                  <Link
                    key={lesson.id}
                    href={hasRawNote ? `/lessons/${lesson.id}/notes` : `/lessons/${lesson.id}/capture`}
                    className={`student-timeline-node timeline-row ${needsNotes ? "student-timeline-node--needs-notes" : ""} ${isCancelled ? "student-timeline-node--cancelled" : ""}`}
                    style={{ display: "block", textDecoration: "none" }}
                  >
                    <div className="flex items-baseline justify-between">
                      <div className="flex items-baseline gap-1.5">
                        <span
                          className="font-display-numerals text-[13px]"
                          style={{
                            fontWeight: needsNotes ? 600 : 500,
                            color: isCancelled ? "var(--ink-tertiary)" : needsNotes ? "var(--ink-primary)" : "var(--ink-secondary)",
                            textDecoration: isCancelled ? "line-through" : "none",
                          }}
                        >
                          {fmtWeekdayDate(lesson.scheduled_at)}
                        </span>
                        <span className="text-[12px]" style={{ color: "var(--ink-tertiary)" }}>
                          · {fmtTime(lesson.scheduled_at)}
                        </span>
                        {isCancelled && <span className="text-[11px]" style={{ color: "var(--ink-tertiary)" }}>· cancelled</span>}
                      </div>

                      {/* Action — always visible for needs-notes, hover for has-notes */}
                      {!isCancelled && (
                        <span
                          className={`text-[12px] font-medium ${hasRawNote ? "timeline-row-actions" : ""}`}
                          style={{
                            color: needsNotes ? "var(--accent-cool)" : "var(--ink-tertiary)",
                            fontWeight: needsNotes ? 600 : 400,
                            ...(hasRawNote ? { display: undefined } : {}),
                          }}
                        >
                          {needsNotes ? "write notes ›" : "view notes ›"}
                        </span>
                      )}
                    </div>

                    {/* Note snippet preview — only for lessons with notes */}
                    {noteSnippet && !isCancelled && (
                      <p className="text-[11px] italic mt-0.5 truncate" style={{ color: "var(--ink-tertiary)", opacity: 0.7 }}>
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
