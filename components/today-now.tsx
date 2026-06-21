"use client";

import Link from "next/link";
import type { Lesson } from "@/lib/types";

/** The "now"-first home: a time-aware view of today pinned to the present
 *  moment — the imminent lesson up top, the rest of today below it, and
 *  finished lessons still needing a note promoted into their own section
 *  (instead of buried in a collapsed "finished" group). Pure presentational:
 *  pass it today's lessons and it derives everything from the clock. */
export default function TodayNow({ lessons }: { lessons: Lesson[] }) {
  const now = Date.now();
  const startOf = (l: Lesson) => new Date(l.scheduled_at).getTime();
  const endOf = (l: Lesson) => startOf(l) + (l.duration_min ?? 60) * 60_000;
  const isCancelled = (l: Lesson) => l.status === "cancelled";
  const hasDraft = (l: Lesson) =>
    !!(l.raw_note && l.raw_note.trim().length > 0);

  // Future = in-progress + upcoming, soonest first. The first is the pinned
  // hero ("now" / "up next"); the rest are "later today".
  const future = lessons
    .filter((l) => !isCancelled(l) && endOf(l) > now)
    .sort((a, b) => startOf(a) - startOf(b));
  const hero = future[0] ?? null;
  const later = future.slice(1);

  // Needs notes = finished, not cancelled, not yet sent — chronological
  // (earliest-finished at top), so you clear them in the order you taught.
  const needsNotes = lessons
    .filter(
      (l) => !isCancelled(l) && endOf(l) <= now && l.note_status !== "sent"
    )
    .sort((a, b) => startOf(a) - startOf(b));

  const active = lessons.filter((l) => !isCancelled(l));
  const doneCount = active.filter((l) => endOf(l) <= now).length;
  const total = active.length;

  const fmt = (t: number) =>
    new Date(t).toLocaleTimeString([], { hour: "numeric", minute: "2-digit" });
  const relUp = (t: number) => {
    const m = Math.round((t - now) / 60_000);
    return m < 60 ? `starts in ${m} min` : `at ${fmt(t)}`;
  };
  const relAgo = (t: number) => {
    const m = Math.max(0, Math.round((now - t) / 60_000));
    return m < 60 ? `${m}m ago` : `${Math.floor(m / 60)}h ${m % 60}m ago`;
  };
  const nameOf = (l: Lesson) => l.student?.name ?? "Student";
  const initialOf = (l: Lesson) =>
    (l.student?.name?.trim()?.[0] ?? "?").toUpperCase();

  const heroInProgress = !!hero && startOf(hero) <= now;

  const sectionLabel = (
    text: string,
    opts?: { accent?: boolean; count?: number }
  ) => (
    <div className="flex items-center gap-2 mb-3">
      <span
        style={{
          fontFamily: "var(--font-instrument), sans-serif",
          fontSize: "12px",
          fontWeight: 600,
          letterSpacing: "0.07em",
          textTransform: "uppercase",
          color: opts?.accent ? "var(--accent-ink)" : "var(--ink-tertiary)",
        }}
      >
        {text}
      </span>
      {typeof opts?.count === "number" && (
        <span
          style={{
            backgroundColor: "var(--accent)",
            color: "#fff",
            fontSize: "11px",
            borderRadius: "999px",
            padding: "0 7px",
            lineHeight: "17px",
          }}
        >
          {opts.count}
        </span>
      )}
    </div>
  );

  if (!hero && needsNotes.length === 0) {
    return (
      <p
        className="text-center py-12 font-display"
        style={{
          fontSize: "20px",
          fontStyle: "italic",
          color: "var(--ink-tertiary)",
          letterSpacing: "0.005em",
        }}
      >
        All caught up. ✓
      </p>
    );
  }

  return (
    <div className="space-y-4">
      {/* Day progress */}
      {total > 0 && (
        <div className="flex items-center gap-3">
          <div
            style={{
              flex: 1,
              height: "5px",
              borderRadius: "3px",
              background: "var(--bg-muted)",
              overflow: "hidden",
            }}
          >
            <div
              style={{
                width: `${Math.round((doneCount / total) * 100)}%`,
                height: "100%",
                background: "var(--accent)",
                borderRadius: "3px",
              }}
            />
          </div>
          <span
            style={{
              fontSize: "12px",
              color: "var(--ink-secondary)",
              whiteSpace: "nowrap",
            }}
          >
            {doneCount} of {total} done
          </span>
        </div>
      )}

      {/* Up next / now */}
      {hero && (
        <div>
          {sectionLabel(
            heroInProgress
              ? `now · ends ${fmt(endOf(hero))}`
              : `up next · ${relUp(startOf(hero))}`,
            { accent: true }
          )}
          <div
            style={{
              backgroundColor: "var(--bg-surface)",
              border: "1px solid var(--line-strong)",
              borderLeft: "3px solid var(--accent)",
              borderRadius: "14px",
              padding: "14px 15px",
            }}
          >
            <div className="flex items-center gap-3">
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
                {initialOf(hero)}
              </div>
              <div className="flex-1">
                <p className="font-display" style={{ fontSize: "18px" }}>
                  {nameOf(hero)}
                </p>
                <p
                  style={{
                    fontSize: "13px",
                    color: "var(--ink-secondary)",
                    marginTop: "1px",
                  }}
                >
                  {fmt(startOf(hero))} – {fmt(endOf(hero))}
                </p>
              </div>
              <span
                style={{
                  fontSize: "12px",
                  backgroundColor: "var(--accent-soft)",
                  color: "var(--accent-ink)",
                  borderRadius: "999px",
                  padding: "4px 11px",
                }}
              >
                {fmt(startOf(hero))}
              </span>
            </div>
            {hero.student?.progress_summary && (
              <p
                style={{
                  fontSize: "13px",
                  color: "var(--ink-secondary)",
                  lineHeight: 1.45,
                  marginTop: "11px",
                  paddingTop: "11px",
                  borderTop: "1px solid var(--line-subtle)",
                }}
              >
                Last time: {hero.student.progress_summary}
              </p>
            )}
            {heroInProgress && (
              <Link
                href={`/lessons/${hero.id}/capture`}
                className="inline-block mt-3"
                style={{
                  fontSize: "13px",
                  fontWeight: 500,
                  color: "var(--accent-ink)",
                }}
              >
                Record now →
              </Link>
            )}
          </div>
        </div>
      )}

      {/* Later today */}
      {later.length > 0 && (
        <div>
          {sectionLabel("later today")}
          <div>
            {later.map((l) => (
              <div
                key={l.id}
                className="flex items-center gap-3"
                style={{
                  padding: "9px 2px",
                  borderTop: "1px solid var(--line-subtle)",
                }}
              >
                <span
                  style={{
                    fontSize: "13px",
                    fontWeight: 500,
                    width: "60px",
                    color: "var(--ink-secondary)",
                  }}
                >
                  {fmt(startOf(l))}
                </span>
                <span
                  style={{
                    fontSize: "14px",
                    flex: 1,
                    color: "var(--ink-secondary)",
                  }}
                >
                  {nameOf(l)}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Needs notes */}
      {needsNotes.length > 0 && (
        <div>
          {sectionLabel("needs notes", { count: needsNotes.length })}
          <div className="space-y-2">
            {needsNotes.map((l) => (
              <div
                key={l.id}
                style={{
                  backgroundColor: "var(--bg-surface)",
                  border: "1px solid var(--line-subtle)",
                  borderRadius: "14px",
                  padding: "12px 14px",
                  display: "flex",
                  alignItems: "center",
                  gap: "12px",
                }}
              >
                <div
                  style={{
                    width: "36px",
                    height: "36px",
                    borderRadius: "50%",
                    backgroundColor: "var(--bg-muted)",
                    color: "var(--ink-secondary)",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    fontWeight: 500,
                    fontSize: "14px",
                  }}
                >
                  {initialOf(l)}
                </div>
                <div className="flex-1">
                  <p style={{ fontSize: "15px", fontWeight: 500 }}>{nameOf(l)}</p>
                  <p style={{ fontSize: "12px", color: "var(--ink-secondary)" }}>
                    {fmt(startOf(l))} · {relAgo(endOf(l))}
                  </p>
                </div>
                <Link
                  href={`/lessons/${l.id}/capture`}
                  style={{
                    fontSize: "13px",
                    fontWeight: 500,
                    color: "var(--accent-ink)",
                    backgroundColor: "var(--accent-soft)",
                    border: "1px solid rgba(165, 82, 42, 0.14)",
                    borderRadius: "9px",
                    padding: "8px 14px",
                    whiteSpace: "nowrap",
                  }}
                >
                  {hasDraft(l) ? "Finish" : "Record"}
                </Link>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
