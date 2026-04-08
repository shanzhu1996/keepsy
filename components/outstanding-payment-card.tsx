"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
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

  async function handleMarkPaid() {
    setLoading(true);
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
      alert("Failed to record payment");
    } finally {
      setLoading(false);
    }
  }

  const isOverdue = cycle.status === "overdue";
  const { isComplete } = cycle;
  const progressPct = Math.min((cycle.lessonsCompleted / cycle.cycleLength) * 100, 100);

  return (
    <div className={`rounded-xl p-4 border ${isOverdue ? "bg-amber-50 border-amber-200" : "bg-gray-50 border-gray-200"}`}>
      <div className="flex justify-between items-start mb-2">
        <div>
          <Link href={`/students/${cycle.studentId}`} className="font-semibold text-gray-900 hover:underline">
            {cycle.studentName}
          </Link>
          <div className="flex items-center gap-2 mt-0.5">
            <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${
              isOverdue ? "bg-amber-500 text-white" : "bg-gray-300 text-gray-700"
            }`}>
              {isOverdue ? "Overdue" : "Pending"}
            </span>
            {isOverdue && cycle.amountDue > 0 && (
              <span className="text-sm font-bold text-amber-900">${cycle.amountDue.toFixed(2)}</span>
            )}
          </div>
        </div>

        {isOverdue && (
          <Button
            size="sm"
            className="bg-green-600 hover:bg-green-700 text-white"
            onClick={() => setShowConfirm(true)}
            disabled={loading}
          >
            Mark Paid ✓
          </Button>
        )}
      </div>

      <div className="w-full bg-gray-200 rounded-full h-1.5 mb-2">
        <div
          className={`h-1.5 rounded-full transition-all ${isOverdue ? "bg-amber-500" : "bg-gray-400"}`}
          style={{ width: `${progressPct}%` }}
        />
      </div>

      <p className="text-xs text-gray-500">
        {cycle.lessonsCompleted} / {cycle.cycleLength} lessons
        {cycle.cycleStartDate && (
          <span className="ml-1">
            · {fmtDate(cycle.cycleStartDate)}
            {cycle.cycleEndDate ? ` – ${fmtDate(cycle.cycleEndDate)}` : " – ongoing"}
          </span>
        )}
        {!cycle.cycleStartDate && <span className="ml-1">· Not started</span>}
      </p>

      {showConfirm && (
        <div className="flex gap-2 items-center mt-3 pt-3 border-t border-amber-200">
          <span className="text-xs text-amber-800">Amount $</span>
          <input
            type="number"
            min="0"
            step="0.01"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            className="border border-amber-300 rounded px-2 py-1 text-sm text-gray-900 bg-white w-24 focus:outline-none focus:ring-1 focus:ring-amber-500"
          />
          <Button size="sm" onClick={handleMarkPaid} disabled={loading || !amount}>
            {loading ? "Saving…" : "Confirm"}
          </Button>
          <button onClick={() => setShowConfirm(false)} className="text-xs text-amber-700 hover:text-amber-900">
            cancel
          </button>
        </div>
      )}
    </div>
  );
}
