"use client";

import { useState } from "react";
import type { MonthlySummary } from "@/lib/payments";

interface IncomeSummaryProps {
  months: MonthlySummary[];
}

export default function IncomeSummary({ months }: IncomeSummaryProps) {
  const [expanded, setExpanded] = useState(false);

  const hasAnyIncome = months.some((m) => m.total > 0);
  if (!hasAnyIncome) return null;

  const current = months[0];

  // Past months: trim trailing $0 months (before user joined)
  const past = months.slice(1);
  let lastIncomeIdx = 0;
  for (let i = past.length - 1; i >= 0; i--) {
    if (past[i].total > 0) {
      lastIncomeIdx = i;
      break;
    }
  }
  const relevantPast = past.slice(0, lastIncomeIdx + 1);
  const hasPast = relevantPast.length > 0;

  return (
    <div className="mb-4">
      {/* Current month — always visible */}
      <div
        className="rounded-[var(--radius-card)] px-4 py-3"
        style={{
          backgroundColor: "var(--bg-surface)",
          border: "1px solid var(--line-subtle)",
        }}
      >
        <div className="flex justify-between items-center">
          <span
            className="text-[13px] font-medium"
            style={{ color: "var(--ink-primary)" }}
          >
            {current.label}
          </span>
          <span
            className="font-display-numerals text-[18px]"
            style={{
              color: "var(--ink-primary)",
              letterSpacing: "-0.01em",
            }}
          >
            ${current.total.toFixed(2)}
          </span>
        </div>

        {/* Previous months toggle */}
        {hasPast && (
          <>
            <button
              type="button"
              onClick={() => setExpanded((v) => !v)}
              className="mt-2 text-[12px]"
              style={{ color: "var(--ink-tertiary)" }}
            >
              {expanded ? "hide previous months" : "previous months"}
            </button>

            {expanded && (
              <div
                className="mt-2 pt-2"
                style={{ borderTop: "1px solid var(--line-subtle)" }}
              >
                {relevantPast.map((m) => (
                  <div
                    key={m.month}
                    className="flex justify-between items-center py-1.5"
                  >
                    <span
                      className="text-[13px]"
                      style={{ color: "var(--ink-secondary)" }}
                    >
                      {m.label}
                    </span>
                    <span
                      className="font-display-numerals text-[13px]"
                      style={{
                        color:
                          m.total > 0
                            ? "var(--ink-secondary)"
                            : "var(--ink-tertiary)",
                      }}
                    >
                      ${m.total.toFixed(2)}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
