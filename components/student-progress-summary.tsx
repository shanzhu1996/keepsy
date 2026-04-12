"use client";

import { useState } from "react";

interface StudentProgressSummaryProps {
  summary: string | null;
  updatedAt: string | null;
  lessonCount: number;
}

function formatUpdatedAt(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString([], {
    month: "short",
    day: "numeric",
  });
}

export default function StudentProgressSummary({
  summary,
  updatedAt,
  lessonCount,
}: StudentProgressSummaryProps) {
  const [expanded, setExpanded] = useState(false);

  if (lessonCount < 3 || !summary) return null;

  return (
    <div className="keepsy-rise keepsy-rise-2" style={{ marginBottom: "4px" }}>
      <button
        type="button"
        onClick={() => setExpanded(!expanded)}
        className="flex items-baseline gap-2 mb-2 w-full text-left"
        style={{ background: "none", border: "none", cursor: "pointer", padding: 0 }}
      >
        <h2
          className="font-display text-lg"
          style={{ color: "var(--ink-primary)" }}
        >
          teacher's notes
        </h2>
        <span
          className="transition-transform"
          style={{
            color: "var(--ink-secondary)",
            display: "inline-block",
            transform: expanded ? "rotate(90deg)" : "rotate(0deg)",
            fontSize: "14px",
          }}
        >
          ›
        </span>
        {!expanded && updatedAt && (
          <span style={{ fontSize: "12px", color: "var(--ink-tertiary)", marginLeft: "4px" }}>
            · updated {formatUpdatedAt(updatedAt)}
          </span>
        )}
      </button>

      <div
        className="finished-collapse"
        data-open={expanded ? "true" : "false"}
      >
        <div>
          <p
            className="text-sm"
            style={{
              color: "var(--ink-secondary)",
              lineHeight: 1.6,
            }}
          >
            {summary}
          </p>
          {updatedAt && (
            <p
              className="text-xs mt-1"
              style={{ color: "var(--ink-tertiary)", opacity: 0.6 }}
            >
              updated {formatUpdatedAt(updatedAt)}
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
