"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import type { Payment } from "@/lib/types";

interface PaymentCardProps {
  payment: Payment;
  showStudent?: boolean;
}

export default function PaymentCard({
  payment,
  showStudent = true,
}: PaymentCardProps) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [reminderDraft, setReminderDraft] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  async function handleMarkPaid() {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/payments/mark-paid", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ paymentId: payment.id }),
      });
      if (!res.ok) throw new Error("Failed");
      router.refresh();
    } catch {
      setError("Couldn't mark as paid");
    } finally {
      setLoading(false);
    }
  }

  async function handleGenerateReminder() {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/messages/payment-reminder", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ paymentId: payment.id }),
      });
      if (!res.ok) throw new Error("Failed");
      const data = await res.json();
      setReminderDraft(data.message);
    } catch {
      setError("Couldn't generate reminder");
    } finally {
      setLoading(false);
    }
  }

  function handleCopy() {
    if (reminderDraft) {
      navigator.clipboard.writeText(reminderDraft);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  }

  return (
    <div
      className="rounded-xl px-4 py-3.5"
      style={{
        backgroundColor: "var(--bg-surface)",
        border: `1px solid ${payment.status === "pending" ? "var(--accent)" : "var(--line-subtle)"}`,
        borderLeftWidth: payment.status === "pending" ? "3px" : "1px",
        boxShadow: "var(--shadow-card)",
      }}
    >
      <div className="flex justify-between items-start">
        <div>
          {showStudent && payment.student && (
            <Link
              href={`/students/${payment.student_id}`}
              className="font-semibold text-sm hover:underline block"
              style={{
                color: "var(--ink-primary)",
                textUnderlineOffset: "3px",
                textDecorationThickness: "1px",
              }}
            >
              {payment.student.name}
            </Link>
          )}
          <p
            className="text-lg font-bold font-display-numerals"
            style={{ color: "var(--ink-primary)" }}
          >
            ${Number(payment.amount).toFixed(2)}
          </p>
          <p className="text-xs" style={{ color: "var(--ink-tertiary)" }}>
            {payment.lesson_count_covered} lessons
          </p>
          {payment.paid_at && (
            <p className="text-xs" style={{ color: "var(--ink-tertiary)" }}>
              paid {new Date(payment.paid_at).toLocaleDateString()}
            </p>
          )}
        </div>
        <span
          className="text-xs font-medium px-2 py-0.5 rounded-full"
          style={{
            backgroundColor:
              payment.status === "pending" ? "var(--accent-soft)" : "var(--bg-muted)",
            color:
              payment.status === "pending" ? "var(--accent-ink)" : "var(--ink-secondary)",
          }}
        >
          {payment.status}
        </span>
      </div>

      {payment.status === "pending" && (
        <div className="flex gap-2 mt-3">
          <button
            onClick={handleMarkPaid}
            disabled={loading}
            className="text-sm font-medium px-3 py-1.5 rounded-lg transition-colors disabled:opacity-50"
            style={{ backgroundColor: "var(--success)", color: "#fff" }}
          >
            mark paid
          </button>
          <button
            onClick={handleGenerateReminder}
            disabled={loading}
            className="text-sm px-3 py-1.5 rounded-lg transition-colors"
            style={{
              border: "1px solid var(--line-strong)",
              color: "var(--ink-secondary)",
              backgroundColor: "transparent",
            }}
          >
            generate reminder
          </button>
        </div>
      )}

      {reminderDraft && (
        <div
          className="mt-3 rounded-lg p-3 text-sm"
          style={{
            backgroundColor: "var(--bg-muted)",
            color: "var(--ink-secondary)",
          }}
        >
          <p>{reminderDraft}</p>
          <button
            className="mt-2 text-xs transition-colors"
            style={{
              color: "var(--accent)",
              textDecoration: "underline",
              textUnderlineOffset: "3px",
            }}
            onClick={handleCopy}
          >
            {copied ? "copied!" : "copy message"}
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
