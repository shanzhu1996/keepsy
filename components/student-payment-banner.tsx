"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
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

const STATUS_STYLES = {
  overdue: {
    wrapper: "bg-amber-50 border-amber-300",
    label: "text-amber-900",
    badge: "bg-amber-500 text-white",
    bar: "bg-amber-500",
    meta: "text-amber-700",
  },
  paid: {
    wrapper: "bg-green-50 border-green-200",
    label: "text-green-900",
    badge: "bg-green-500 text-white",
    bar: "bg-green-400",
    meta: "text-green-700",
  },
  pending: {
    wrapper: "bg-gray-50 border-gray-200",
    label: "text-gray-700",
    badge: "bg-gray-300 text-gray-700",
    bar: "bg-gray-300",
    meta: "text-gray-500",
  },
};

const STATUS_LABEL = {
  overdue: "Overdue",
  paid: "Paid",
  pending: "Pending",
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
  const s = STATUS_STYLES[billingStatus];

  return (
    <div className={`rounded-xl p-4 mb-4 border ${s.wrapper}`}>
      <div className="flex justify-between items-start mb-2">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <p className={`text-sm font-medium ${s.label}`}>Billing cycle</p>
            <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${s.badge}`}>
              {STATUS_LABEL[billingStatus]}
            </span>
          </div>

          {billingStatus === "overdue" && amountDue > 0 && isCurrentCycleComplete && (
            <p className="text-2xl font-bold text-amber-900">${amountDue.toFixed(2)}</p>
          )}

          <p className={`text-xs mt-0.5 ${s.meta}`}>
            {lessonsInCurrentCycle} / {cycleLength} lessons
            {student.cycle_price && billingStatus !== "overdue" ? ` · $${student.cycle_price}/cycle` : ""}
            {cycleStartDate && (
              <span className="ml-1">
                · {fmtDate(cycleStartDate)}
                {cycleEndDate ? ` – ${fmtDate(cycleEndDate)}` : " – ongoing"}
              </span>
            )}
          </p>
        </div>

        {billingStatus === "overdue" && (
          <Button
            onClick={() => setShowManual(true)}
            disabled={loading}
            className="bg-green-600 hover:bg-green-700 text-white"
          >
            Student Paid ✓
          </Button>
        )}
      </div>

      {/* Progress bar */}
      <div className="w-full bg-gray-200 rounded-full h-1.5 mb-3">
        <div
          className={`h-1.5 rounded-full transition-all ${s.bar}`}
          style={{ width: `${progressPct}%` }}
        />
      </div>

      {billingStatus === "overdue" && !showManual && (
        <button
          onClick={() => setShowManual(true)}
          className="text-xs text-gray-400 hover:text-gray-600 underline"
        >
          Record a payment manually
        </button>
      )}

      {showManual && (
        <div className="flex gap-2 items-center mt-1 pt-2 border-t border-gray-200">
          <span className="text-xs text-gray-600">Amount $</span>
          <input
            type="number"
            min="0"
            step="0.01"
            value={manualAmount}
            onChange={(e) => setManualAmount(e.target.value)}
            className="border border-gray-300 rounded px-2 py-1 text-sm text-gray-900 bg-white w-24 focus:outline-none focus:ring-1 focus:ring-amber-500"
            placeholder="0.00"
          />
          <Button size="sm" onClick={handleRecordPayment} disabled={loading || !manualAmount}>
            {loading ? "Saving…" : "Record"}
          </Button>
          <button onClick={() => setShowManual(false)} className="text-xs text-gray-400 hover:text-gray-600">
            cancel
          </button>
        </div>
      )}
    </div>
  );
}
