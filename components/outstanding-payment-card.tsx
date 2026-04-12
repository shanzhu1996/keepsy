"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import type { ActiveCycle } from "@/lib/payments";

function fmtDate(iso: string) {
  return new Date(iso).toLocaleDateString([], {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

export default function OutstandingPaymentCard({ cycle }: { cycle: ActiveCycle }) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [amount, setAmount] = useState(cycle.amountDue > 0 ? cycle.amountDue.toFixed(2) : "");
  const [error, setError] = useState<string | null>(null);

  async function handleMarkPaid() {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/payments/record", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          studentId: cycle.studentId,
          amount: parseFloat(amount) || 0,
          lessonCount: cycle.lessonsCompleted,
        }),
      });
      if (!res.ok) throw new Error("Failed");
      router.refresh();
    } catch {
      setError("Couldn't record payment");
    } finally {
      setLoading(false);
    }
  }

  const isOverdue = cycle.status === "overdue";

  return (
    <div
      className="rounded-[var(--radius-card)] px-4 py-3.5"
      style={{
        backgroundColor: isOverdue ? "var(--card-progress-tint)" : "var(--bg-surface)",
        border: `1px solid var(--line-subtle)`,
        borderLeftWidth: isOverdue ? "3px" : "1px",
        borderLeftColor: isOverdue ? "var(--accent)" : "var(--line-subtle)",
        boxShadow: "var(--shadow-card)",
      }}
    >
      <div className="flex justify-between items-start">
        <div>
          <Link
            href={`/students/${cycle.studentId}`}
            className="text-[14px] font-semibold hover:underline"
            style={{
              color: "var(--ink-primary)",
              textUnderlineOffset: "3px",
              textDecorationThickness: "1px",
            }}
          >
            {cycle.studentName}
          </Link>
          <div className="flex items-center gap-2 mt-1">
            <span
              className="text-[11px] font-semibold px-2 py-0.5 rounded-full"
              style={{
                backgroundColor: isOverdue ? "var(--accent-soft)" : "var(--bg-muted)",
                color: isOverdue ? "var(--accent-ink)" : "var(--ink-secondary)",
              }}
            >
              {isOverdue ? "due" : "in progress"}
            </span>
            {isOverdue && cycle.amountDue > 0 && (
              <span
                className="text-[15px] font-display-numerals font-medium"
                style={{ color: "var(--ink-primary)" }}
              >
                ${cycle.amountDue.toFixed(2)}
              </span>
            )}
          </div>
        </div>

        {isOverdue && !showConfirm && (
          <button
            type="button"
            onClick={() => setShowConfirm(true)}
            disabled={loading}
            className="text-[13px] font-semibold px-3 py-1.5 rounded-[var(--radius)] transition-colors"
            style={{
              backgroundColor: "var(--success)",
              color: "#fff",
            }}
          >
            mark paid
          </button>
        )}
      </div>

      <p className="text-[12px] mt-2" style={{ color: "var(--ink-tertiary)" }}>
        {cycle.lessonsCompleted} / {cycle.cycleLength} lessons
        {cycle.cycleStartDate && (
          <span className="ml-1">
            · {fmtDate(cycle.cycleStartDate)}
            {cycle.cycleEndDate ? ` – ${fmtDate(cycle.cycleEndDate)}` : " – ongoing"}
          </span>
        )}
        {!cycle.cycleStartDate && <span className="ml-1">· not started</span>}
      </p>

      {/* Confirm payment row */}
      {showConfirm && (
        <div
          className="flex gap-2 items-center mt-3 pt-3"
          style={{ borderTop: "1px solid var(--line-subtle)" }}
        >
          <span className="text-[12px]" style={{ color: "var(--ink-secondary)" }}>
            $
          </span>
          <input
            type="number"
            min="0"
            step="0.01"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            className="h-8 px-2 text-[14px] rounded-[var(--radius)] outline-none w-24 transition-colors"
            style={{
              backgroundColor: "var(--bg-surface)",
              border: "1px solid var(--line-strong)",
              color: "var(--ink-primary)",
            }}
            onFocus={(e) =>
              (e.currentTarget.style.borderColor = "var(--accent)")
            }
            onBlur={(e) =>
              (e.currentTarget.style.borderColor = "var(--line-strong)")
            }
          />
          <button
            type="button"
            onClick={handleMarkPaid}
            disabled={loading || !amount}
            className="text-[13px] font-medium px-3 py-1.5 rounded-[var(--radius)] transition-colors disabled:opacity-50"
            style={{
              backgroundColor: "var(--success)",
              color: "#fff",
            }}
          >
            {loading ? "saving..." : "confirm"}
          </button>
          <button
            type="button"
            onClick={() => {
              setShowConfirm(false);
              setError(null);
            }}
            className="text-[12px]"
            style={{ color: "var(--ink-tertiary)" }}
          >
            cancel
          </button>
        </div>
      )}

      {error && (
        <p className="text-[12px] mt-2" style={{ color: "var(--danger)" }}>
          {error}
        </p>
      )}
    </div>
  );
}
