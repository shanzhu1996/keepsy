"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import type { ActiveCycle } from "@/lib/payments";

function fmtDate(iso: string) {
  return new Date(iso).toLocaleDateString([], {
    month: "short",
    day: "numeric",
  });
}

function fmtRelativeDate(iso: string) {
  const d = new Date(iso);
  const now = new Date();
  const diffDays = Math.floor((now.getTime() - d.getTime()) / (1000 * 60 * 60 * 24));
  if (diffDays === 0) return "today";
  if (diffDays === 1) return "yesterday";
  if (diffDays < 7) return `${diffDays} days ago`;
  return fmtDate(iso);
}

export default function OutstandingPaymentCard({
  cycle,
  teacherName,
}: {
  cycle: ActiveCycle;
  teacherName?: string | null;
}) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [showReminder, setShowReminder] = useState(false);
  const [amount, setAmount] = useState(
    cycle.amountDue > 0 ? cycle.amountDue.toFixed(2) : ""
  );
  const [error, setError] = useState<string | null>(null);
  const [reminderText, setReminderText] = useState<string | null>(null);
  const [reminderChannel, setReminderChannel] = useState<"sms" | "email" | null>(null);
  const [copied, setCopied] = useState(false);
  const [sent, setSent] = useState(false);
  const [sendingSMS, setSendingSMS] = useState(false);
  const [sendingEmail, setSendingEmail] = useState(false);
  const [justPaid, setJustPaid] = useState(false);

  const isOverdue = cycle.status === "overdue";
  const firstName = cycle.studentName.split(" ")[0];
  const canSendSMS = !!cycle.studentPhone;
  const canSendEmail = !!cycle.studentEmail;

  // ─── Templates ───

  function getNextClassStr() {
    if (!cycle.nextLessonDate) return null;
    return new Date(cycle.nextLessonDate).toLocaleDateString([], {
      weekday: "long",
      month: "long",
      day: "numeric",
    });
  }

  function buildSmsTemplate(): string {
    const nextClass = getNextClassStr();
    const signOff = teacherName ? ` — ${teacherName}` : "";
    if (isOverdue) {
      const unpaidLine =
        cycle.lessonsInUnpaidCycle > 0
          ? ` You currently have ${cycle.lessonsInUnpaidCycle} unpaid ${cycle.lessonsInUnpaidCycle === 1 ? "lesson" : "lessons"}.`
          : "";
      const nextLine = nextClass
        ? ` Please arrange payment before your next lesson on ${nextClass}.`
        : ` Please arrange payment before your next lesson.`;
      return `Hi ${firstName}, friendly reminder that payment of $${cycle.amountDue.toFixed(2)} for your package of ${cycle.cycleLength} lessons is outstanding.${unpaidLine}${nextLine}${signOff}`;
    }
    if (nextClass) {
      return `Hi ${firstName}, reminder that payment of $${cycle.amountDue.toFixed(2)} for your next ${cycle.cycleLength} lessons (starting ${nextClass}) is due. Let me know if you have questions!${signOff}`;
    }
    return `Hi ${firstName}, reminder that payment of $${cycle.amountDue.toFixed(2)} for your next package of ${cycle.cycleLength} lessons is due. Let me know if you have questions!${signOff}`;
  }

  function buildEmailTemplate(): string {
    const nextClass = getNextClassStr();

    if (isOverdue) {
      const unpaidLine =
        cycle.lessonsInUnpaidCycle > 0
          ? ` You currently have ${cycle.lessonsInUnpaidCycle} unpaid ${cycle.lessonsInUnpaidCycle === 1 ? "lesson" : "lessons"}.`
          : "";
      const nextLine = nextClass
        ? ` Please arrange payment before your next lesson on ${nextClass}.`
        : ` Please arrange payment before your next lesson.`;
      return `Hi ${firstName},

Just a friendly reminder that payment of $${cycle.amountDue.toFixed(2)} for your current package of ${cycle.cycleLength} lessons is outstanding.${unpaidLine}${nextLine}

Let me know if you have any questions!${teacherName ? `\n\n${teacherName}` : ""}`;
    }

    const startLine = nextClass
      ? `your next package of ${cycle.cycleLength} lessons, starting ${nextClass}`
      : `your next package of ${cycle.cycleLength} lessons`;

    return `Hi ${firstName},

Just a friendly reminder that payment of $${cycle.amountDue.toFixed(2)} for ${startLine} is due.

Let me know if you have any questions!${teacherName ? `\n\n${teacherName}` : ""}`;
  }

  // ─── Actions ───

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
          lessonCount: cycle.cycleLength,
        }),
      });
      if (!res.ok) throw new Error("Failed");
      setShowConfirm(false);
      setJustPaid(true);
      setTimeout(() => {
        router.refresh();
      }, 1500);
    } catch {
      setError("Couldn't record payment");
    } finally {
      setLoading(false);
    }
  }

  function handleOpenReminder() {
    setReminderText(canSendSMS ? buildSmsTemplate() : buildEmailTemplate());
    setReminderChannel(canSendSMS ? "sms" : canSendEmail ? "email" : null);
    setShowReminder(true);
  }

  function buildReminderMessage(): string {
    return reminderText || buildSmsTemplate();
  }

  async function handleCopyReminder() {
    const text = buildReminderMessage();
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      setError("Couldn't copy");
    }
  }

  async function handleSendSMS() {
    setSendingSMS(true);
    setError(null);
    try {
      const res = await fetch("/api/notifications/send-sms", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          studentPhone: cycle.studentPhone,
          studentId: cycle.studentId,
          message: buildReminderMessage(),
        }),
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to send");
      }
      setShowReminder(false);
      setSent(true);
      setTimeout(() => setSent(false), 3000);
    } catch (e) {
      const msg = e instanceof Error ? e.message : "";
      setError(
        msg.includes("Twilio")
          ? "SMS not configured yet — copy the message instead"
          : "Couldn't send SMS"
      );
      setShowReminder(false);
    } finally {
      setSendingSMS(false);
    }
  }

  async function handleSendEmail() {
    setSendingEmail(true);
    setError(null);
    try {
      const res = await fetch("/api/notifications/send-email", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          studentEmail: cycle.studentEmail,
          studentId: cycle.studentId,
          message: buildReminderMessage(),
          subject: `Payment Reminder – ${firstName}`,
        }),
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to send");
      }
      setShowReminder(false);
      setSent(true);
      setTimeout(() => setSent(false), 3000);
    } catch (e) {
      const msg = e instanceof Error ? e.message : "";
      setError(
        msg.includes("domain") ||
          msg.includes("verify") ||
          msg.includes("Resend") ||
          msg.includes("Email service")
          ? "Email not configured yet — copy the message instead"
          : "Couldn't send email"
      );
      setShowReminder(false);
    } finally {
      setSendingEmail(false);
    }
  }

  // ─── Payment confirmation toast ───
  if (justPaid) {
    return (
      <div
        className="rounded-[var(--radius-card)] px-4 py-4 text-center"
        style={{
          backgroundColor: "var(--bg-surface)",
          border: "1px solid var(--line-subtle)",
          boxShadow: "var(--shadow-card)",
        }}
      >
        <p className="text-[14px] font-medium" style={{ color: "var(--success)" }}>
          ✓ ${parseFloat(amount).toFixed(2)} recorded for {firstName}
        </p>
      </div>
    );
  }

  // ─── Due / overdue card ───
  return (
    <div
      className="rounded-[var(--radius-card)] px-4 py-3.5"
      style={{
        backgroundColor: isOverdue ? "var(--card-progress-tint)" : "var(--bg-surface)",
        border: "1px solid var(--line-subtle)",
        borderLeftWidth: isOverdue ? "3px" : "1px",
        borderLeftColor: isOverdue ? "var(--accent)" : "var(--line-subtle)",
        boxShadow: "var(--shadow-card)",
      }}
    >
      {/* Header */}
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
            {isOverdue ? "overdue" : "due"}
          </span>
          {cycle.amountDue > 0 && (
            <span
              className="text-[15px] font-display-numerals font-medium"
              style={{ color: "var(--ink-primary)" }}
            >
              ${cycle.amountDue.toFixed(2)}
            </span>
          )}
        </div>
      </div>

      {/* Context info */}
      <p className="text-[12px] mt-2" style={{ color: "var(--ink-tertiary)" }}>
        {isOverdue ? (
          <>
            {cycle.lessonsInUnpaidCycle} unpaid{" "}
            {cycle.lessonsInUnpaidCycle === 1 ? "lesson" : "lessons"}
            {cycle.cycleStartDate && (
              <span className="ml-1">· since {fmtDate(cycle.cycleStartDate)}</span>
            )}
          </>
        ) : (
          <>
            {cycle.cycleLength}-lesson package
            {cycle.isNewStudent ? (
              <span className="ml-1">· collect before first lesson</span>
            ) : cycle.lastCycleStartDate && cycle.lastCycleEndDate ? (
              <span className="ml-1">
                · last: {fmtDate(cycle.lastCycleStartDate)} –{" "}
                {fmtDate(cycle.lastCycleEndDate)}
              </span>
            ) : null}
          </>
        )}
      </p>

      {/* Last reminded */}
      {cycle.lastRemindedAt && (
        <p className="text-[11px] mt-1" style={{ color: "var(--ink-tertiary)" }}>
          reminded {fmtRelativeDate(cycle.lastRemindedAt)}
        </p>
      )}

      {/* Action buttons — mark paid (primary) + send reminder (secondary text link) */}
      {!showConfirm && (
        <div className="flex items-center gap-4 mt-3">
          <button
            type="button"
            onClick={() => setShowConfirm(true)}
            disabled={loading}
            className="text-[13px] font-semibold px-4 py-2 rounded-[var(--radius)] transition-colors"
            style={{
              backgroundColor: "var(--success)",
              color: "#fff",
            }}
          >
            mark paid
          </button>
          <button
            type="button"
            onClick={handleOpenReminder}
            className="text-[13px] font-medium transition-colors"
            style={{
              color: "var(--accent)",
            }}
          >
            send reminder
          </button>
        </div>
      )}

      {/* Confirm payment row */}
      {showConfirm && (
        <div
          className="flex gap-2 items-center mt-3 pt-3"
          style={{ borderTop: "1px solid var(--line-subtle)" }}
        >
          <span className="text-[12px]" style={{ color: "var(--ink-secondary)" }}>$</span>
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
            onFocus={(e) => (e.currentTarget.style.borderColor = "var(--accent)")}
            onBlur={(e) => (e.currentTarget.style.borderColor = "var(--line-strong)")}
          />
          <button
            type="button"
            onClick={handleMarkPaid}
            disabled={loading || !amount}
            className="text-[13px] font-medium px-3 py-1.5 rounded-[var(--radius)] transition-colors disabled:opacity-50"
            style={{ backgroundColor: "var(--success)", color: "#fff" }}
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

      {/* Sent confirmation */}
      {sent && (
        <p className="text-[12px] mt-2" style={{ color: "var(--success)" }}>
          reminder sent to {firstName}
        </p>
      )}

      {error && (
        <p className="text-[12px] mt-2" style={{ color: "var(--danger)" }}>
          {error}
        </p>
      )}

      {/* ─── Reminder action sheet ─── */}
      {showReminder && reminderText != null && (
        <>
          <div
            className="fixed inset-0 z-30"
            style={{ backgroundColor: "rgba(0,0,0,0.3)" }}
            onClick={() => setShowReminder(false)}
          />
          <div
            className="fixed bottom-0 left-0 right-0 z-40 px-4 pb-6 pt-5"
            style={{
              backgroundColor: "var(--bg-canvas)",
              borderRadius: "20px 20px 0 0",
              boxShadow: "0 -8px 40px rgba(0,0,0,0.12)",
            }}
          >
            <div className="max-w-lg w-full mx-auto">
              {/* Drag handle */}
              <div className="flex justify-center mb-3">
                <div
                  className="w-10 h-1 rounded-full"
                  style={{ backgroundColor: "var(--line-strong)" }}
                />
              </div>

              {/* Header */}
              <p
                className="text-[14px] font-semibold mb-3"
                style={{ color: "var(--ink-primary)" }}
              >
                Reminder for {firstName}
              </p>

              {/* Channel toggle */}
              {(canSendSMS || canSendEmail) && (
                <div
                  className="flex gap-0.5 rounded-full p-0.5 mb-3 w-fit"
                  style={{
                    backgroundColor: "var(--bg-muted)",
                    border: "1px solid var(--line-subtle)",
                  }}
                >
                  {canSendSMS && (
                    <button
                      type="button"
                      onClick={() => {
                        setReminderChannel("sms");
                        setReminderText(buildSmsTemplate());
                      }}
                      className="px-3 py-1 rounded-full text-[12px] font-medium transition-colors"
                      style={{
                        backgroundColor:
                          reminderChannel === "sms" ? "var(--bg-surface)" : "transparent",
                        color:
                          reminderChannel === "sms"
                            ? "var(--ink-primary)"
                            : "var(--ink-tertiary)",
                        boxShadow:
                          reminderChannel === "sms" ? "var(--shadow-card)" : "none",
                      }}
                    >
                      SMS
                    </button>
                  )}
                  {canSendEmail && (
                    <button
                      type="button"
                      onClick={() => {
                        setReminderChannel("email");
                        setReminderText(buildEmailTemplate());
                      }}
                      className="px-3 py-1 rounded-full text-[12px] font-medium transition-colors"
                      style={{
                        backgroundColor:
                          reminderChannel === "email" ? "var(--bg-surface)" : "transparent",
                        color:
                          reminderChannel === "email"
                            ? "var(--ink-primary)"
                            : "var(--ink-tertiary)",
                        boxShadow:
                          reminderChannel === "email" ? "var(--shadow-card)" : "none",
                      }}
                    >
                      Email
                    </button>
                  )}
                </div>
              )}

              {/* Editable preview */}
              <div className="relative mb-4">
                <textarea
                  value={reminderText ?? ""}
                  onChange={(e) => setReminderText(e.target.value)}
                  className="w-full rounded-[var(--radius)] p-3 text-[13px] outline-none resize-none"
                  style={{
                    backgroundColor: "var(--bg-muted)",
                    color: "var(--ink-secondary)",
                    lineHeight: 1.6,
                    minHeight: reminderChannel === "email" ? "160px" : "100px",
                    border: "1px solid var(--line-subtle)",
                  }}
                  onFocus={(e) =>
                    (e.currentTarget.style.borderColor = "var(--accent)")
                  }
                  onBlur={(e) =>
                    (e.currentTarget.style.borderColor = "var(--line-subtle)")
                  }
                />
                <p
                  className="text-[11px] mt-1.5 ml-1"
                  style={{ color: "var(--ink-tertiary)" }}
                >
                  tap to edit before sending
                </p>
              </div>

              {/* Send button */}
              {reminderChannel && (
                <button
                  type="button"
                  onClick={
                    reminderChannel === "sms" ? handleSendSMS : handleSendEmail
                  }
                  disabled={sendingSMS || sendingEmail}
                  className="w-full h-11 text-[14px] font-semibold rounded-[var(--radius)] mb-3 disabled:opacity-50"
                  style={{
                    backgroundColor: "var(--accent)",
                    color: "#fff",
                    boxShadow: "var(--shadow-cta)",
                  }}
                >
                  {sendingSMS
                    ? "sending sms..."
                    : sendingEmail
                      ? "sending email..."
                      : `send via ${reminderChannel}`}
                </button>
              )}

              {/* Missing contact hint */}
              {!canSendSMS && !canSendEmail && (
                <Link
                  href={`/students/${cycle.studentId}/edit`}
                  className="block text-center text-[13px] mb-3"
                  style={{ color: "var(--accent)" }}
                >
                  add phone or email to send reminders
                </Link>
              )}

              {/* Copy + Cancel */}
              <div className="flex items-center justify-center gap-4">
                <button
                  type="button"
                  onClick={() => {
                    handleCopyReminder();
                    setShowReminder(false);
                  }}
                  className="text-[13px] font-medium"
                  style={{ color: "var(--ink-secondary)" }}
                >
                  {copied ? "copied!" : "copy"}
                </button>
                <button
                  type="button"
                  onClick={() => setShowReminder(false)}
                  className="text-[13px]"
                  style={{ color: "var(--ink-tertiary)" }}
                >
                  cancel
                </button>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
