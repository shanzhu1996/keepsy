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

  const fmt = (n: number) =>
    n.toLocaleString(undefined, {
      minimumFractionDigits: n % 1 === 0 ? 0 : 2,
      maximumFractionDigits: 2,
    });

  return (
    <div className="mb-4">
      <div
        className="rounded-[14px] px-5 py-4"
        style={{
          backgroundColor: "var(--bg-surface)",
          border: "1px solid var(--line-strong)",
        }}
      >
        {/* Current month — the satisfying number, front and center */}
        <p
          style={{
            fontFamily: "var(--font-instrument), sans-serif",
            fontSize: "12px",
            fontWeight: 600,
            letterSpacing: "0.07em",
            textTransform: "uppercase",
            color: "var(--ink-tertiary)",
          }}
        >
          {current.label}
        </p>
        <p
          className="font-display-numerals"
          style={{
            fontSize: "36px",
            lineHeight: 1.1,
            color: "var(--ink-primary)",
            letterSpacing: "-0.02em",
            marginTop: "4px",
          }}
        >
          ${fmt(current.total)}
        </p>

        {/* Previous months toggle */}
        {hasPast && (
          <>
            <button
              type="button"
              onClick={() => setExpanded((v) => !v)}
              className="mt-3 text-[12px]"
              style={{ color: "var(--accent-ink)" }}
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
                      className="font-display-numerals text-[14px]"
                      style={{
                        color:
                          m.total > 0
                            ? "var(--ink-secondary)"
                            : "var(--ink-tertiary)",
                      }}
                    >
                      ${fmt(m.total)}
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
