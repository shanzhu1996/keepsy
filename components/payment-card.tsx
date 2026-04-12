"use client";

import { useState, useRef, useEffect } from "react";
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

  // Menu & edit/delete state
  const [menuOpen, setMenuOpen] = useState(false);
  const [editing, setEditing] = useState(false);
  const [editAmount, setEditAmount] = useState(Number(payment.amount).toFixed(2));
  const [confirmDelete, setConfirmDelete] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  // Close menu on outside click
  useEffect(() => {
    if (!menuOpen) return;
    function handleClick(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setMenuOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, [menuOpen]);

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

  async function handleUpdateAmount() {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/payments/update", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ paymentId: payment.id, amount: editAmount }),
      });
      if (!res.ok) throw new Error("Failed");
      setEditing(false);
      router.refresh();
    } catch {
      setError("Couldn't update amount");
    } finally {
      setLoading(false);
    }
  }

  async function handleDelete() {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/payments/delete", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ paymentId: payment.id }),
      });
      if (!res.ok) throw new Error("Failed");
      setConfirmDelete(false);
      router.refresh();
    } catch {
      setError("Couldn't remove payment");
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

  const isPaid = payment.status === "paid";

  return (
    <div
      className="rounded-[var(--radius-card)] px-4 py-3.5 relative"
      style={{
        backgroundColor: "var(--bg-surface)",
        border: `1px solid ${!isPaid ? "var(--accent)" : "var(--line-subtle)"}`,
        borderLeftWidth: !isPaid ? "3px" : "1px",
        boxShadow: "var(--shadow-card)",
      }}
    >
      <div className="flex justify-between items-start">
        <div>
          {showStudent && payment.student && (
            <Link
              href={`/students/${payment.student_id}`}
              className="font-semibold text-[14px] hover:underline block"
              style={{
                color: "var(--ink-primary)",
                textUnderlineOffset: "3px",
                textDecorationThickness: "1px",
              }}
            >
              {payment.student.name}
            </Link>
          )}

          {/* Amount — editable or static */}
          {editing ? (
            <div className="flex items-center gap-2 mt-1">
              <span className="text-[12px]" style={{ color: "var(--ink-secondary)" }}>$</span>
              <input
                type="number"
                min="0"
                step="0.01"
                value={editAmount}
                onChange={(e) => setEditAmount(e.target.value)}
                autoFocus
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
                onKeyDown={(e) => {
                  if (e.key === "Enter") handleUpdateAmount();
                  if (e.key === "Escape") {
                    setEditing(false);
                    setEditAmount(Number(payment.amount).toFixed(2));
                  }
                }}
              />
              <button
                type="button"
                onClick={handleUpdateAmount}
                disabled={loading || !editAmount}
                className="text-[12px] font-medium px-2.5 py-1 rounded-[var(--radius)] disabled:opacity-50"
                style={{ backgroundColor: "var(--success)", color: "#fff" }}
              >
                {loading ? "..." : "save"}
              </button>
              <button
                type="button"
                onClick={() => {
                  setEditing(false);
                  setEditAmount(Number(payment.amount).toFixed(2));
                }}
                className="text-[12px]"
                style={{ color: "var(--ink-tertiary)" }}
              >
                cancel
              </button>
            </div>
          ) : (
            <p
              className="text-[18px] font-medium font-display-numerals"
              style={{ color: "var(--ink-primary)" }}
            >
              ${Number(payment.amount).toFixed(2)}
            </p>
          )}

          <p className="text-[12px]" style={{ color: "var(--ink-tertiary)" }}>
            {payment.lesson_count_covered} lessons
          </p>
          {payment.paid_at && (
            <p className="text-[12px]" style={{ color: "var(--ink-tertiary)" }}>
              paid {new Date(payment.paid_at).toLocaleDateString()}
            </p>
          )}
        </div>

        <div className="flex items-center gap-2">
          <span
            className="text-[11px] font-medium px-2 py-0.5 rounded-full"
            style={{
              backgroundColor: !isPaid ? "var(--accent-soft)" : "var(--bg-muted)",
              color: !isPaid ? "var(--accent-ink)" : "var(--ink-secondary)",
            }}
          >
            {payment.status}
          </span>

          {/* ··· menu for paid payments */}
          {isPaid && (
            <div className="relative" ref={menuRef}>
              <button
                type="button"
                onClick={() => setMenuOpen((v) => !v)}
                className="w-7 h-7 flex items-center justify-center rounded-full transition-colors"
                style={{ color: "var(--ink-tertiary)" }}
                aria-label="Payment options"
              >
                ···
              </button>
              {menuOpen && (
                <div
                  className="absolute right-0 top-8 rounded-[var(--radius)] py-1 min-w-[140px] z-30"
                  style={{
                    backgroundColor: "var(--bg-surface)",
                    boxShadow: "var(--shadow-popover)",
                    border: "1px solid var(--line-subtle)",
                  }}
                >
                  <button
                    type="button"
                    onClick={() => {
                      setMenuOpen(false);
                      setEditing(true);
                    }}
                    className="w-full text-left px-3 py-2 text-[13px] transition-colors"
                    style={{ color: "var(--ink-primary)" }}
                  >
                    edit amount
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setMenuOpen(false);
                      setConfirmDelete(true);
                    }}
                    className="w-full text-left px-3 py-2 text-[13px] transition-colors"
                    style={{ color: "var(--danger)" }}
                  >
                    remove payment
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Pending payment actions */}
      {!isPaid && (
        <div className="flex gap-2 mt-3">
          <button
            onClick={handleMarkPaid}
            disabled={loading}
            className="text-[13px] font-medium px-3 py-1.5 rounded-[var(--radius)] transition-colors disabled:opacity-50"
            style={{ backgroundColor: "var(--success)", color: "#fff" }}
          >
            mark paid
          </button>
          <button
            onClick={handleGenerateReminder}
            disabled={loading}
            className="text-[13px] px-3 py-1.5 rounded-[var(--radius)] transition-colors"
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

      {/* Reminder draft */}
      {reminderDraft && (
        <div
          className="mt-3 rounded-[var(--radius)] p-3 text-[13px]"
          style={{
            backgroundColor: "var(--bg-muted)",
            color: "var(--ink-secondary)",
          }}
        >
          <p>{reminderDraft}</p>
          <button
            className="mt-2 text-[12px] transition-colors"
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

      {/* Error */}
      {error && (
        <p className="text-[12px] mt-2" style={{ color: "var(--danger)" }}>
          {error}
        </p>
      )}

      {/* Delete confirmation overlay */}
      {confirmDelete && (
        <>
          <div
            className="fixed inset-0 z-30"
            style={{ backgroundColor: "rgba(0,0,0,0.3)" }}
            onClick={() => setConfirmDelete(false)}
          />
          <div
            className="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 z-40 w-[min(320px,calc(100vw-48px))] rounded-[var(--radius-card)] px-5 py-5"
            style={{
              backgroundColor: "var(--bg-surface)",
              boxShadow: "var(--shadow-popover)",
            }}
          >
            <h3
              className="text-[16px] font-semibold mb-2"
              style={{ color: "var(--ink-primary)" }}
            >
              Remove this payment?
            </h3>
            <p
              className="text-[13px] mb-1"
              style={{ color: "var(--ink-secondary)" }}
            >
              ${Number(payment.amount).toFixed(2)}
              {payment.student ? ` · ${payment.student.name}` : ""}
              {payment.paid_at
                ? ` · ${new Date(payment.paid_at).toLocaleDateString()}`
                : ""}
            </p>
            <p
              className="text-[12px] mb-5"
              style={{ color: "var(--ink-tertiary)" }}
            >
              This will affect billing cycle tracking.
            </p>
            <div className="flex gap-3">
              <button
                type="button"
                onClick={() => setConfirmDelete(false)}
                className="flex-1 h-10 text-[13px] font-medium rounded-[var(--radius)]"
                style={{
                  border: "1px solid var(--line-strong)",
                  color: "var(--ink-secondary)",
                  backgroundColor: "transparent",
                }}
              >
                cancel
              </button>
              <button
                type="button"
                onClick={handleDelete}
                disabled={loading}
                className="flex-1 h-10 text-[13px] font-medium rounded-[var(--radius)] disabled:opacity-50"
                style={{
                  backgroundColor: "var(--danger)",
                  color: "#fff",
                }}
              >
                {loading ? "removing..." : "remove"}
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
