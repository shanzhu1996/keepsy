"use client";

import { useState } from "react";
import type { Payment } from "@/lib/types";

interface StudentPaymentsProps {
  payments: Payment[];
  lastPaymentHint?: string | null;
}

function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString([], {
    month: "short",
    day: "numeric",
  });
}

export default function StudentPayments({ payments, lastPaymentHint }: StudentPaymentsProps) {
  const [showPayments, setShowPayments] = useState(false);

  return (
    <div>
      <button
        type="button"
        onClick={() => setShowPayments(!showPayments)}
        className="flex items-baseline gap-2 mb-3"
        style={{ background: "none", border: "none", cursor: "pointer", padding: 0 }}
      >
        <span style={{ fontSize: "14px", fontWeight: 500, color: "var(--ink-secondary)" }}>
          payments
        </span>
        <span style={{ fontSize: "12px", color: "var(--ink-tertiary)" }}>
          {payments.length}
        </span>
        <span
          className="transition-transform"
          style={{
            color: "var(--ink-secondary)",
            display: "inline-block",
            transform: showPayments ? "rotate(90deg)" : "rotate(0deg)",
            fontSize: "14px",
          }}
        >
          ›
        </span>
        {!showPayments && lastPaymentHint && (
          <span style={{ fontSize: "12px", color: "var(--ink-tertiary)", marginLeft: "4px" }}>
            · {lastPaymentHint}
          </span>
        )}
      </button>

      <div
        className="finished-collapse"
        data-open={showPayments ? "true" : "false"}
      >
        <div>
          <div className="space-y-1">
            {payments.map((payment) => (
              <div
                key={payment.id}
                className="flex items-center justify-between rounded-lg"
                style={{
                  padding: "8px 12px",
                  backgroundColor: "var(--bg-surface)",
                  border: `1px solid ${payment.status === "pending" ? "var(--accent)" : "var(--line-subtle)"}`,
                  borderLeftWidth: payment.status === "pending" ? "3px" : "1px",
                }}
              >
                <div className="flex items-baseline gap-2">
                  <span
                    className="font-display-numerals text-sm font-medium"
                    style={{ color: "var(--ink-primary)" }}
                  >
                    ${Number(payment.amount).toFixed(0)}
                  </span>
                  <span className="text-xs" style={{ color: "var(--ink-tertiary)" }}>
                    {payment.lesson_count_covered} lessons
                  </span>
                  {payment.paid_at && (
                    <span className="text-xs" style={{ color: "var(--ink-tertiary)" }}>
                      · paid {formatDate(payment.paid_at)}
                    </span>
                  )}
                </div>
                <span
                  className="text-xs font-medium px-2 py-0.5 rounded-full"
                  style={{
                    backgroundColor:
                      payment.status === "pending" ? "var(--accent-soft)" : "var(--bg-canvas)",
                    color:
                      payment.status === "pending" ? "var(--accent-ink)" : "var(--ink-tertiary)",
                  }}
                >
                  {payment.status}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
