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

export default function StudentPaymentBanner({
  student,
  billingStatus,
  lessonsInCurrentCycle,
  isCurrentCycleComplete,
  amountDue,
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
  const isOverdue = billingStatus === "overdue";
  const dotColor = isOverdue ? "var(--accent)" : billingStatus === "paid" ? "var(--success)" : "var(--line-strong)";
  const emptyDotColor = "var(--line-subtle)";

  return (
    <div>
      {/* Billing label */}
      <h2 className="font-label mb-3" style={{ color: "var(--ink-secondary)" }}>
        billing
      </h2>
      {/* Main billing row */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
            {/* Progress bar */}
            <div
              className="rounded-full"
              style={{
                width: "80px",
                height: "4px",
                backgroundColor: emptyDotColor,
              }}
            >
              <div
                className="rounded-full h-full transition-all"
                style={{
                  width: `${Math.min((lessonsInCurrentCycle / cycleLength) * 100, 100)}%`,
                  backgroundColor: dotColor,
                }}
              />
            </div>

            <span style={{ fontSize: "14px", fontWeight: 500, color: isOverdue ? "var(--accent-ink)" : "var(--ink-secondary)" }}>
              {lessonsInCurrentCycle} of {cycleLength}
              {isOverdue && (
                <span style={{ fontWeight: 700, marginLeft: "6px" }}>overdue</span>
              )}
            </span>
          </div>

        {isOverdue && !showManual && (
          <button
            onClick={() => setShowManual(true)}
            disabled={loading}
            className="text-[12px] font-semibold px-3 py-1.5 rounded-[8px] transition-colors"
            style={{ backgroundColor: "var(--success)", color: "#fff" }}
          >
            mark paid
          </button>
        )}
      </div>

      {/* Manual payment input */}
      {showManual && (
        <div
          className="flex gap-2 items-center mt-2 pt-2"
          style={{ borderTop: "1px solid var(--line-subtle)" }}
        >
          <span className="text-xs" style={{ color: "var(--ink-secondary)" }}>$</span>
          <input
            type="number"
            min="0"
            step="0.01"
            value={manualAmount}
            onChange={(e) => setManualAmount(e.target.value)}
            className="rounded px-2 py-1 text-sm w-20 focus:outline-none"
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
            className="text-[12px] font-medium px-2.5 py-1 rounded-[8px] transition-colors disabled:opacity-50"
            style={{ backgroundColor: "var(--accent)", color: "#fff" }}
          >
            {loading ? "…" : "record"}
          </button>
          <button
            onClick={() => setShowManual(false)}
            className="text-xs"
            style={{ color: "var(--ink-tertiary)" }}
          >
            cancel
          </button>
        </div>
      )}

      {!showManual && isOverdue && (
        <button
          onClick={() => setShowManual(true)}
          className="text-[12px] mt-1 transition-colors"
          style={{ color: "var(--ink-tertiary)", textDecoration: "underline", textUnderlineOffset: "3px", background: "none", border: "none", cursor: "pointer", padding: 0 }}
        >
          record manually
        </button>
      )}
    </div>
  );
}
