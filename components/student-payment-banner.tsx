"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import type { Student } from "@/lib/types";

interface StudentPaymentBannerProps {
  student: Student;
  billingStatus: "overdue" | "paid" | "pending";
  lessonsInCurrentCycle: number;
  isCurrentCycleComplete: boolean;
  amountDue: number;
  cycleStartDate: string | null;
  cycleEndDate: string | null;
}

function fmtDate(iso: string) {
  return new Date(iso).toLocaleDateString([], {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

const STATUS_CONFIG = {
  overdue: {
    badgeBg: "var(--accent-soft)",
    badgeInk: "var(--accent-ink)",
    barColor: "var(--accent)",
    label: "overdue",
  },
  paid: {
    badgeBg: "var(--bg-muted)",
    badgeInk: "var(--ink-secondary)",
    barColor: "var(--success)",
    label: "paid",
  },
  pending: {
    badgeBg: "var(--bg-muted)",
    badgeInk: "var(--ink-tertiary)",
    barColor: "var(--line-strong)",
    label: "pending",
  },
};

export default function StudentPaymentBanner({
  student,
  billingStatus,
  lessonsInCurrentCycle,
  isCurrentCycleComplete,
  amountDue,
  cycleStartDate,
  cycleEndDate,
}: StudentPaymentBannerProps) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [showManual, setShowManual] = useState(false);
  const [manualAmount, setManualAmount] = useState(
    amountDue > 0 ? amountDue.toFixed(2) : (student.cycle_price?.toString() ?? "")
  );

  async function handleRecordPayment() {
    if (!manualAmount) return;
    setLoading(true);
    try {
      const res = await fetch("/api/payments/record", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          studentId: student.id,
          amount: parseFloat(manualAmount),
          lessonCount: lessonsInCurrentCycle,
        }),
      });
      if (!res.ok) throw new Error("Failed");
      setShowManual(false);
      router.refresh();
    } catch {
      alert("Failed to record payment");
    } finally {
      setLoading(false);
    }
  }

  if (!student.billing_enabled || !student.billing_cycle_lessons) return null;

  const cycleLength = student.billing_cycle_lessons;
  const progressPct = Math.min((lessonsInCurrentCycle / cycleLength) * 100, 100);
  const cfg = STATUS_CONFIG[billingStatus];

  return (
    <div
      className="rounded-xl px-4 py-3 mb-3"
      style={{
        backgroundColor: "var(--bg-surface)",
        border: `1px solid ${billingStatus === "overdue" ? "var(--accent)" : "var(--line-subtle)"}`,
        borderLeftWidth: billingStatus === "overdue" ? "3px" : "1px",
      }}
    >
      <div className="flex justify-between items-start mb-2">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <p className="text-sm font-medium" style={{ color: "var(--ink-primary)" }}>
              billing cycle
            </p>
            <span
              className="text-xs font-medium px-2 py-0.5 rounded-full"
              style={{ backgroundColor: cfg.badgeBg, color: cfg.badgeInk }}
            >
              {cfg.label}
            </span>
          </div>

          {billingStatus === "overdue" && amountDue > 0 && isCurrentCycleComplete && (
            <p
              className="text-2xl font-bold font-display-numerals"
              style={{ color: "var(--accent-ink)" }}
            >
              ${amountDue.toFixed(2)}
            </p>
          )}

          <p className="text-xs mt-0.5" style={{ color: "var(--ink-tertiary)" }}>
            {lessonsInCurrentCycle} of {cycleLength} lessons
            {student.cycle_price && billingStatus !== "overdue" ? ` · $${student.cycle_price}` : ""}
            {cycleStartDate && (
              <span className="ml-1">
                · {fmtDate(cycleStartDate)}
                {cycleEndDate ? ` – ${fmtDate(cycleEndDate)}` : " – ongoing"}
              </span>
            )}
          </p>
        </div>

        {billingStatus === "overdue" && (
          <button
            onClick={() => setShowManual(true)}
            disabled={loading}
            className="text-sm font-medium px-3 py-1.5 rounded-lg transition-colors"
            style={{
              backgroundColor: "var(--success)",
              color: "#fff",
            }}
          >
            student paid
          </button>
        )}
      </div>

      {/* Progress bar */}
      <div
        className="w-full rounded-full h-1.5 mb-3"
        style={{ backgroundColor: "var(--line-subtle)" }}
      >
        <div
          className="h-1.5 rounded-full transition-all"
          style={{ width: `${progressPct}%`, backgroundColor: cfg.barColor }}
        />
      </div>

      {billingStatus === "overdue" && !showManual && (
        <button
          onClick={() => setShowManual(true)}
          className="text-xs transition-colors"
          style={{
            color: "var(--ink-tertiary)",
            textDecoration: "underline",
            textUnderlineOffset: "3px",
          }}
        >
          record a payment manually
        </button>
      )}

      {showManual && (
        <div
          className="flex gap-2 items-center mt-1 pt-2"
          style={{ borderTop: "1px solid var(--line-subtle)" }}
        >
          <span className="text-xs" style={{ color: "var(--ink-secondary)" }}>
            amount $
          </span>
          <input
            type="number"
            min="0"
            step="0.01"
            value={manualAmount}
            onChange={(e) => setManualAmount(e.target.value)}
            className="rounded px-2 py-1 text-sm w-24 focus:outline-none focus:ring-1"
            style={{
              border: "1px solid var(--line-strong)",
              backgroundColor: "var(--bg-surface)",
              color: "var(--ink-primary)",
            }}
            placeholder="0.00"
          />
          <button
            onClick={handleRecordPayment}
            disabled={loading || !manualAmount}
            className="text-sm font-medium px-3 py-1 rounded-lg transition-colors disabled:opacity-50"
            style={{ backgroundColor: "var(--accent)", color: "#fff" }}
          >
            {loading ? "saving…" : "record"}
          </button>
          <button
            onClick={() => setShowManual(false)}
            className="text-xs transition-colors"
            style={{ color: "var(--ink-tertiary)" }}
          >
            cancel
          </button>
        </div>
      )}
    </div>
  );
}
