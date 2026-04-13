"use client";

import { useState, useCallback, useMemo } from "react";
import { createClient } from "@/lib/supabase/client";
import type { MessageLog, ContactMethod } from "@/lib/types";

interface StudentMessagesProps {
  messages: MessageLog[];
  studentName: string;
  studentPhone: string | null;
  studentEmail: string | null;
  studentId: string;
  nextLessonTime?: string;
  amountDue?: number;
  autoRemind: boolean;
  contactMethod: ContactMethod;
  teacherName?: string | null;
  lastMessageHint?: string | null;
}

function formatMessageDate(dateStr: string): string {
  const d = new Date(dateStr);
  const now = new Date();
  const isToday = d.toDateString() === now.toDateString();
  if (isToday) {
    return d.toLocaleTimeString([], { hour: "numeric", minute: "2-digit" }).toLowerCase();
  }
  return d.toLocaleDateString([], { month: "short", day: "numeric" });
}

function messageTypeLabel(type: string): string {
  if (type === "manual-copy") return "copied";
  if (type === "dry-run") return "draft";
  if (type === "sms") return "sms";
  return type;
}

function messageCategory(log: MessageLog): string {
  if (log.lesson_id && !log.payment_id) return "note";
  if (log.payment_id) return "payment";
  const c = log.content?.toLowerCase() || "";
  if (c.includes("payment") || c.includes("due") || c.includes("invoice")) return "payment";
  if (c.includes("reminder") || c.includes("lesson")) return "reminder";
  return "custom";
}

function cleanPreview(content: string): string {
  let s = content.replace(/\s+/g, " ").trim();
  if (s.length > 120) s = s.slice(0, 120).trimEnd() + "…";
  return s;
}

type GroupedMessage =
  | { kind: "single"; msg: MessageLog; category: string }
  | { kind: "group"; category: string; count: number; firstDate: string; lastDate: string; messages: MessageLog[] };

function groupMessages(messages: MessageLog[]): GroupedMessage[] {
  const result: GroupedMessage[] = [];
  let i = 0;
  while (i < messages.length) {
    const msg = messages[i];
    const category = messageCategory(msg);
    // Only group auto-reminders (reminder/note categories that were sent automatically)
    if (category === "reminder" || category === "note") {
      let j = i + 1;
      while (j < messages.length && messageCategory(messages[j]) === category) {
        j++;
      }
      const groupSize = j - i;
      if (groupSize >= 2) {
        result.push({
          kind: "group",
          category,
          count: groupSize,
          firstDate: messages[j - 1].sent_at || messages[j - 1].created_at,
          lastDate: messages[i].sent_at || messages[i].created_at,
          messages: messages.slice(i, j),
        });
        i = j;
        continue;
      }
    }
    result.push({ kind: "single", msg, category });
    i++;
  }
  return result;
}

export default function StudentMessages({
  messages: initialMessages,
  studentName,
  studentPhone,
  studentEmail,
  studentId,
  nextLessonTime,
  amountDue,
  autoRemind: initialAutoRemind,
  contactMethod: initialContactMethod,
  teacherName,
  lastMessageHint,
}: StudentMessagesProps) {
  const supabase = createClient();
  const [messages, setMessages] = useState(initialMessages);
  const [showComposer, setShowComposer] = useState(true);
  const [composerType, setComposerType] = useState<"lesson_reminder" | "payment_reminder" | "custom">("custom");
  const [composerMessage, setComposerMessage] = useState("");
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);
  const [sendChannel, setSendChannel] = useState<"sms" | "email">(
    initialContactMethod === "email" ? "email" : "sms"
  );

  // Auto-send config state
  const [autoRemind, setAutoRemind] = useState(initialAutoRemind);
  const [autoPaymentRemind, setAutoPaymentRemind] = useState(false);
  const [contactMethod, setContactMethod] = useState<ContactMethod>(initialContactMethod);
  const [savingConfig, setSavingConfig] = useState(false);

  const [phone, setPhone] = useState(studentPhone);
  const [email, setEmail] = useState(studentEmail);
  const [addingContact, setAddingContact] = useState<"phone" | "email" | null>(null);
  const [contactInput, setContactInput] = useState("");
  const [savingContact, setSavingContact] = useState(false);

  const hasPhone = !!phone;
  const hasEmail = !!email;
  const [showAllMessages, setShowAllMessages] = useState(false);
  const [expandedGroups, setExpandedGroups] = useState<Set<number>>(new Set());

  function toggleGroup(idx: number) {
    setExpandedGroups((prev) => {
      const next = new Set(prev);
      if (next.has(idx)) next.delete(idx);
      else next.add(idx);
      return next;
    });
  }

  const grouped = useMemo(() => groupMessages(messages), [messages]);
  const DEFAULT_VISIBLE = 3;
  const visibleGrouped = showAllMessages ? grouped : grouped.slice(0, DEFAULT_VISIBLE);
  const hiddenCount = messages.length - visibleGrouped.reduce((n, g) => n + (g.kind === "group" ? g.count : 1), 0);

  // Templates — different tone for SMS vs email
  const firstName = studentName.split(" ")[0];
  const smsSignOff = teacherName ? `\n\n- ${teacherName}` : "";
  const emailSignOff = teacherName ? `\n\nBest,\n${teacherName}` : "";

  const getTemplate = useCallback((type: string, channel?: "sms" | "email") => {
    const ch = channel ?? sendChannel;
    // Extract just the time (e.g. "7:00 PM") from the full date string
    const timePart = nextLessonTime?.match(/\d{1,2}:\d{2}\s*[AP]M/i)?.[0];
    const whenPart = nextLessonTime
      ? ` on ${nextLessonTime}`
      : "";
    const amountPart = amountDue ? ` of $${amountDue}` : "";

    if (type === "lesson_reminder") {
      if (ch === "email") {
        return `Hi ${firstName},\n\nThis is a friendly reminder about your upcoming lesson${whenPart}.\n\nPlease don't hesitate to reach out if you have any questions.${emailSignOff}`;
      }
      return `Hi ${firstName}, just a kind reminder about our lesson${whenPart}. See you then!${smsSignOff}`;
    }
    if (type === "payment_reminder") {
      if (ch === "email") {
        return `Hi ${firstName},\n\nThis is a friendly reminder that your payment${amountPart} is due before your next lesson package begins.\n\nPlease let me know if you have any questions.${emailSignOff}`;
      }
      return `Hi ${firstName}, just a friendly reminder that your payment${amountPart} is due before your next package starts. Let me know if you have any questions!${smsSignOff}`;
    }
    return "";
  }, [firstName, nextLessonTime, amountDue, smsSignOff, emailSignOff, sendChannel]);

  function handleSelectType(type: "lesson_reminder" | "payment_reminder" | "custom", channel?: "sms" | "email") {
    setComposerType(type);
    setComposerMessage(getTemplate(type, channel));
    setSent(false);
  }

  function openComposer(type: "lesson_reminder" | "payment_reminder" | "custom" = "custom") {
    handleSelectType(type);
    setShowComposer(true);
  }

  function handleChannelSwitch(channel: "sms" | "email") {
    setSendChannel(channel);
    // Re-generate template for the new channel tone (only if using a template, not custom)
    if (composerType !== "custom") {
      setComposerMessage(getTemplate(composerType, channel));
    }
  }

  async function handleSend(channel?: "sms" | "email") {
    const useChannel = channel ?? sendChannel;
    if (channel) setSendChannel(channel);
    if (!composerMessage.trim()) return;
    setSending(true);
    try {
      if (useChannel === "sms") {
        if (!phone) {
          setSending(false);
          return;
        }
        const res = await fetch("/api/notifications/send-sms", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ studentPhone: phone, studentId, message: composerMessage }),
        });
        if (!res.ok) {
          const data = await res.json().catch(() => ({}));
          throw new Error(data.error || "Failed to send SMS");
        }
      } else if (useChannel === "email") {
        if (!email) {
          setSending(false);
          return;
        }
        const subject = composerType === "lesson_reminder"
          ? "Lesson reminder"
          : composerType === "payment_reminder"
          ? "Payment reminder"
          : "Message from your teacher";
        const res = await fetch("/api/notifications/send-email", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ studentEmail: email, studentId, message: composerMessage, subject }),
        });
        if (!res.ok) {
          const data = await res.json().catch(() => ({}));
          throw new Error(data.error || "Failed to send email");
        }
      }

      // Fetch the latest log (API route already logged it)
      const { data: logs } = await supabase
        .from("message_logs")
        .select("*")
        .eq("student_id", studentId)
        .order("created_at", { ascending: false })
        .limit(1);

      if (logs?.[0]) {
        setMessages((prev) => [logs[0], ...prev]);
      }

      setSent(true);
      setTimeout(() => {
        setShowComposer(false);
        setSent(false);
        setComposerMessage("");
      }, 1500);
    } catch (err) {
      alert(err instanceof Error ? err.message : "Failed to send message");
    } finally {
      setSending(false);
    }
  }

  async function updateStudentField(field: string, value: boolean | string) {
    setSavingConfig(true);
    try {
      await supabase
        .from("students")
        .update({ [field]: value })
        .eq("id", studentId);
    } catch {
      // revert on error
    } finally {
      setSavingConfig(false);
    }
  }

  function handleAutoRemindToggle() {
    const next = !autoRemind;
    setAutoRemind(next);
    updateStudentField("auto_remind", next);
  }

  function handleAutoPaymentRemindToggle() {
    const next = !autoPaymentRemind;
    setAutoPaymentRemind(next);
    // TODO: persist when auto_payment_remind column exists
    // updateStudentField("auto_payment_remind", next);
  }

  function handleContactMethodChange(method: ContactMethod) {
    setContactMethod(method);
    updateStudentField("contact_method", method);
  }

  async function handleSaveContact() {
    if (!contactInput.trim()) return;
    const contactType = addingContact || (sendChannel === "sms" ? "phone" : "email");
    setSavingContact(true);
    try {
      const field = contactType === "phone" ? "phone" : "email";
      await supabase
        .from("students")
        .update({ [field]: contactInput.trim() })
        .eq("id", studentId);
      if (contactType === "phone") setPhone(contactInput.trim());
      else setEmail(contactInput.trim());
      setAddingContact(null);
      setContactInput("");
    } catch {
      // keep form open on error
    } finally {
      setSavingContact(false);
    }
  }

  const [showSection, setShowSection] = useState(false);

  return (
    <div>
      {/* ─── Section heading ─── */}
      <div className="flex items-center justify-between mb-3">
        <button
          type="button"
          onClick={() => setShowSection(!showSection)}
          className="flex items-baseline gap-2"
          style={{ background: "none", border: "none", cursor: "pointer", padding: 0 }}
        >
          <h2
            className="font-display text-lg"
            style={{ color: "var(--ink-primary)" }}
          >
            messages
          </h2>
          {messages.length > 0 && (
            <span style={{ fontSize: "13px", color: "var(--ink-secondary)" }}>
              {messages.length}
            </span>
          )}
          <span
            className="transition-transform"
            style={{
              color: "var(--ink-secondary)",
              display: "inline-block",
              transform: showSection ? "rotate(90deg)" : "rotate(0deg)",
              fontSize: "14px",
            }}
          >
            ›
          </span>
          {!showSection && lastMessageHint && (
            <span style={{ fontSize: "12px", color: "var(--ink-tertiary)", marginLeft: "4px" }}>
              · {lastMessageHint}
            </span>
          )}
        </button>
        {!showSection && (
          (studentPhone || studentEmail) ? (
            <button
              type="button"
              onClick={() => {
                setShowSection(true);
                openComposer("custom");
              }}
              className="text-[13px] font-medium transition-colors"
              style={{ color: "var(--accent)", background: "none", border: "none", cursor: "pointer", padding: 0 }}
            >
              send a reminder →
            </button>
          ) : (
            <span style={{ fontSize: "12px", color: "var(--ink-tertiary)" }}>
              add contact to send
            </span>
          )
        )}
      </div>

      <div
        className="finished-collapse"
        data-open={showSection ? "true" : "false"}
      >
        <div>

      {/* ─── 1. Quick-send (primary action, top) ─── */}
      {!showComposer ? (
        <button
          type="button"
          onClick={() => openComposer("custom")}
          className="w-full flex items-center gap-2 transition-colors mb-4"
          style={{
            color: "var(--ink-secondary)",
            padding: "6px 0",
            background: "none",
            border: "none",
            cursor: "pointer",
          }}
          onMouseEnter={(e) => (e.currentTarget.style.color = "var(--accent-ink)")}
          onMouseLeave={(e) => (e.currentTarget.style.color = "var(--ink-secondary)")}
        >
          <span style={{ fontSize: "14px", lineHeight: 1 }}>+</span>
          <span style={{ fontSize: "12px", fontWeight: 500, letterSpacing: "0.03em" }}>
            send message
          </span>
        </button>
      ) : (
        <div
          className="rounded-xl mb-4"
          style={{
            padding: "16px",
            backgroundColor: "var(--bg-surface)",
            border: "1px solid var(--line-strong)",
          }}
        >
          {/* Composer header */}
          <div className="flex items-center justify-between mb-3">
            <h3
              className="font-display"
              style={{ fontSize: "16px", color: "var(--ink-primary)" }}
            >
              send to {studentName.toLowerCase()}
            </h3>
            <button
              type="button"
              onClick={() => { setShowComposer(false); setSent(false); }}
              className="text-xs"
              style={{ color: "var(--ink-tertiary)", background: "none", border: "none", cursor: "pointer" }}
            >
              ✕
            </button>
          </div>

          {/* Type chips */}
          <div className="flex gap-2 mb-3">
            {[
              { id: "lesson_reminder" as const, label: "lesson reminder" },
              { id: "payment_reminder" as const, label: "payment reminder" },
              { id: "custom" as const, label: "custom" },
            ].map((opt) => {
              const selected = composerType === opt.id;
              return (
                <button
                  key={opt.id}
                  type="button"
                  onClick={() => handleSelectType(opt.id)}
                  className="transition-colors"
                  style={{
                    padding: "5px 12px",
                    borderRadius: "8px",
                    fontSize: "12px",
                    fontWeight: 500,
                    border: selected ? "1px solid var(--accent)" : "1px solid var(--line-strong)",
                    backgroundColor: selected ? "var(--accent-soft)" : "var(--bg-canvas)",
                    color: selected ? "var(--accent-ink)" : "var(--ink-secondary)",
                    cursor: "pointer",
                  }}
                >
                  {opt.label}
                </button>
              );
            })}
          </div>

          {/* Message textarea */}
          <textarea
            value={composerMessage}
            onChange={(e) => { setComposerMessage(e.target.value); setSent(false); }}
            placeholder="write your message…"
            rows={sendChannel === "email" ? 6 : 3}
            className="w-full resize-none mb-3"
            style={{
              padding: "10px 12px",
              borderRadius: "10px",
              fontSize: "13px",
              lineHeight: 1.5,
              border: "1px solid var(--line-strong)",
              backgroundColor: "var(--bg-canvas)",
              color: "var(--ink-primary)",
              outline: "none",
              fontFamily: "inherit",
            }}
          />

          {/* Channel toggle + send */}
          {(() => {
            const channelMissing = (sendChannel === "sms" && !hasPhone) || (sendChannel === "email" && !hasEmail);
            return (
              <>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1">
                    <span style={{ fontSize: "11px", color: "var(--ink-tertiary)" }}>via</span>
                    <button
                      type="button"
                      onClick={() => handleChannelSwitch("sms")}
                      style={{
                        fontSize: "12px",
                        fontWeight: sendChannel === "sms" ? 600 : 400,
                        color: sendChannel === "sms" ? "var(--ink-primary)" : "var(--ink-tertiary)",
                        background: "none",
                        border: "none",
                        cursor: "pointer",
                        padding: "2px 4px",
                        textDecoration: sendChannel === "sms" ? "underline" : "none",
                        textUnderlineOffset: "3px",
                      }}
                    >
                      sms
                    </button>
                    <span style={{ fontSize: "11px", color: "var(--line-strong)" }}>·</span>
                    <button
                      type="button"
                      onClick={() => handleChannelSwitch("email")}
                      style={{
                        fontSize: "12px",
                        fontWeight: sendChannel === "email" ? 600 : 400,
                        color: sendChannel === "email" ? "var(--ink-primary)" : "var(--ink-tertiary)",
                        background: "none",
                        border: "none",
                        cursor: "pointer",
                        padding: "2px 4px",
                        textDecoration: sendChannel === "email" ? "underline" : "none",
                        textUnderlineOffset: "3px",
                      }}
                    >
                      email
                    </button>
                  </div>
                  <button
                    type="button"
                    onClick={() => handleSend()}
                    disabled={sending || !composerMessage.trim() || sent || channelMissing}
                    className="transition-colors"
                    style={{
                      padding: "7px 18px",
                      borderRadius: "8px",
                      fontSize: "13px",
                      fontWeight: 500,
                      backgroundColor: sent ? "var(--accent-cool)" : "var(--accent)",
                      color: "#FFFFFF",
                      border: "none",
                      cursor: sending || !composerMessage.trim() || channelMissing ? "not-allowed" : "pointer",
                      opacity: sending || !composerMessage.trim() || channelMissing ? 0.4 : 1,
                    }}
                  >
                    {sent ? "sent ✓" : sending ? "sending…" : "send"}
                  </button>
                </div>

                {/* Inline contact input */}
                {channelMissing && (
                  <div
                    className="flex items-center gap-2 mt-2"
                    style={{
                      padding: "7px 10px",
                      borderRadius: "8px",
                      backgroundColor: "var(--bg-canvas)",
                      border: "1px solid var(--line-strong)",
                    }}
                  >
                    <input
                      type={sendChannel === "sms" ? "tel" : "email"}
                      value={contactInput}
                      onChange={(e) => setContactInput(e.target.value)}
                      placeholder={sendChannel === "sms" ? "add phone number" : "add email address"}
                      autoFocus
                      className="flex-1"
                      style={{
                        fontSize: "12px",
                        background: "none",
                        border: "none",
                        outline: "none",
                        color: "var(--ink-primary)",
                        fontFamily: "inherit",
                        minWidth: 0,
                      }}
                      onKeyDown={(e) => {
                        if (e.key === "Enter" && contactInput.trim()) handleSaveContact();
                      }}
                      onBlur={() => {
                        if (contactInput.trim()) handleSaveContact();
                      }}
                    />
                    {savingContact && (
                      <span style={{ fontSize: "11px", color: "var(--ink-tertiary)" }}>saving…</span>
                    )}
                  </div>
                )}
              </>
            );
          })()}
        </div>
      )}

      {/* ─── 2. Auto-send config (set-and-forget, middle) ─── */}
      <div
        className="rounded-lg mb-4"
        style={{
          backgroundColor: "var(--bg-surface)",
          border: "1px solid var(--line-subtle)",
          overflow: "hidden",
        }}
      >
        {/* Header row: "auto-send" + channel selector */}
        <div
          className="flex items-center justify-between"
          style={{ padding: "8px 12px 6px", borderBottom: "1px solid var(--line-subtle)" }}
        >
          <span
            style={{
              fontSize: "11px",
              fontWeight: 500,
              color: "var(--ink-tertiary)",
              letterSpacing: "0.03em",
            }}
          >
            auto-send
          </span>
          {(hasPhone || hasEmail) && (
            <button
              type="button"
              onClick={() => {
                if (hasPhone && hasEmail) {
                  handleContactMethodChange(
                    contactMethod === "email" ? "sms" : "email"
                  );
                }
              }}
              style={{
                fontSize: "11px",
                fontWeight: 500,
                color: "var(--ink-tertiary)",
                background: "none",
                border: "none",
                cursor: hasPhone && hasEmail ? "pointer" : "default",
                letterSpacing: "0.02em",
              }}
            >
              via {contactMethod === "email" ? "email" : "sms"}
              {hasPhone && hasEmail && (
                <span style={{ marginLeft: "3px", fontSize: "10px" }}>›</span>
              )}
            </button>
          )}
        </div>

        {/* Toggle rows */}
        <button
          type="button"
          onClick={handleAutoRemindToggle}
          className="w-full flex items-center justify-between transition-colors"
          style={{
            padding: "10px 12px",
            cursor: "pointer",
            background: "none",
            border: "none",
            borderBottom: "1px solid var(--line-subtle)",
          }}
        >
          <div className="flex items-baseline gap-2">
            <span className="text-sm" style={{ color: "var(--ink-primary)" }}>
              lesson reminders
            </span>
            <span style={{ fontSize: "11px", color: "var(--ink-tertiary)" }}>
              24h before
            </span>
          </div>
          <span
            className="text-xs font-medium transition-colors"
            style={{
              color: autoRemind ? "var(--accent-ink)" : "var(--ink-tertiary)",
            }}
          >
            {autoRemind ? "on" : "off"}
          </span>
        </button>

        <button
          type="button"
          onClick={handleAutoPaymentRemindToggle}
          className="w-full flex items-center justify-between transition-colors"
          style={{
            padding: "10px 12px",
            cursor: "pointer",
            background: "none",
            border: "none",
          }}
        >
          <div className="flex items-baseline gap-2">
            <span className="text-sm" style={{ color: "var(--ink-primary)" }}>
              payment reminders
            </span>
            <span style={{ fontSize: "11px", color: "var(--ink-tertiary)" }}>
              on cycle
            </span>
          </div>
          <span
            className="text-xs font-medium transition-colors"
            style={{
              color: autoPaymentRemind ? "var(--accent-ink)" : "var(--ink-tertiary)",
            }}
          >
            {autoPaymentRemind ? "on" : "off"}
          </span>
        </button>

        {savingConfig && (
          <div style={{ padding: "0 12px 6px" }}>
            <p className="text-xs" style={{ color: "var(--ink-tertiary)" }}>saving…</p>
          </div>
        )}
      </div>

      {/* ─── 3. Message history (reference, bottom) ─── */}
      {messages.length === 0 ? (
        <p
          className="text-sm py-1 font-display italic"
          style={{ color: "var(--ink-tertiary)" }}
        >
          no messages yet
        </p>
      ) : (
        <div>
          <button
            type="button"
            onClick={() => setShowAllMessages(!showAllMessages)}
            className="flex items-center gap-1.5 mb-2"
            style={{
              background: "none",
              border: "none",
              cursor: "pointer",
              padding: 0,
            }}
          >
            <span
              style={{
                fontSize: "11px",
                fontWeight: 500,
                color: "var(--ink-tertiary)",
                letterSpacing: "0.03em",
              }}
            >
              history · {messages.length}
            </span>
            <span
              className="transition-transform"
              style={{
                color: "var(--ink-tertiary)",
                display: "inline-block",
                transform: showAllMessages ? "rotate(90deg)" : "rotate(0deg)",
                fontSize: "12px",
              }}
            >
              ›
            </span>
          </button>

          {/* Always show last message as a preview */}
          {!showAllMessages && grouped.length > 0 && (() => {
            const latest = grouped[0];
            if (latest.kind === "single") {
              return (
                <div
                  className="rounded-lg"
                  style={{
                    padding: "6px 12px",
                    backgroundColor: "var(--bg-surface)",
                    border: "1px solid var(--line-subtle)",
                  }}
                >
                  <div className="flex items-center gap-2">
                    <span
                      className="text-xs font-medium px-1.5 py-0.5 rounded"
                      style={{
                        backgroundColor: "var(--bg-canvas)",
                        color: "var(--ink-tertiary)",
                        fontSize: "10px",
                        letterSpacing: "0.02em",
                      }}
                    >
                      {latest.category}
                    </span>
                    <span className="text-xs" style={{ color: "var(--ink-tertiary)" }}>
                      {latest.msg.sent ? "sent" : messageTypeLabel(latest.msg.type)} {formatMessageDate(latest.msg.sent_at || latest.msg.created_at)}
                    </span>
                  </div>
                  <p
                    className="text-xs note-clamp mt-0.5"
                    style={{ color: "var(--ink-secondary)", lineHeight: 1.4 }}
                  >
                    {cleanPreview(latest.msg.content)}
                  </p>
                </div>
              );
            }
            if (latest.kind === "group") {
              return (
                <div
                  className="rounded-lg"
                  style={{
                    padding: "6px 12px",
                    backgroundColor: "var(--bg-surface)",
                    border: "1px solid var(--line-subtle)",
                  }}
                >
                  <div className="flex items-center gap-2">
                    <span
                      className="text-xs font-medium px-1.5 py-0.5 rounded"
                      style={{
                        backgroundColor: "var(--bg-canvas)",
                        color: "var(--ink-tertiary)",
                        fontSize: "10px",
                        letterSpacing: "0.02em",
                      }}
                    >
                      {latest.category}
                    </span>
                    <span className="text-xs" style={{ color: "var(--ink-tertiary)" }}>
                      {latest.count} sent · {formatMessageDate(latest.firstDate)} – {formatMessageDate(latest.lastDate)}
                    </span>
                  </div>
                </div>
              );
            }
            return null;
          })()}

          {/* Full history (expanded) */}
          {showAllMessages && (
            <div className="space-y-1">
              {grouped.map((item, idx) => {
                if (item.kind === "group") {
                  const isExpanded = expandedGroups.has(idx);
                  return (
                    <div key={`group-${idx}`}>
                      <button
                        type="button"
                        onClick={() => toggleGroup(idx)}
                        className="rounded-lg flex items-center justify-between w-full"
                        style={{
                          padding: "8px 12px",
                          backgroundColor: "var(--bg-surface)",
                          border: "1px solid var(--line-subtle)",
                          cursor: "pointer",
                          background: "var(--bg-surface)",
                        }}
                      >
                        <div className="flex items-center gap-2">
                          <span
                            className="text-xs font-medium px-1.5 py-0.5 rounded"
                            style={{
                              backgroundColor: "var(--bg-canvas)",
                              color: "var(--ink-tertiary)",
                              fontSize: "10px",
                              letterSpacing: "0.02em",
                            }}
                          >
                            {item.category}
                          </span>
                          <span className="text-xs" style={{ color: "var(--ink-tertiary)" }}>
                            {item.count} sent · {formatMessageDate(item.firstDate)} – {formatMessageDate(item.lastDate)}
                          </span>
                        </div>
                        <span
                          className="transition-transform"
                          style={{
                            color: "var(--ink-tertiary)",
                            display: "inline-block",
                            transform: isExpanded ? "rotate(90deg)" : "rotate(0deg)",
                            fontSize: "12px",
                          }}
                        >
                          ›
                        </span>
                      </button>
                      {isExpanded && (
                        <div className="space-y-1 mt-1" style={{ paddingLeft: "12px" }}>
                          {item.messages.map((msg) => (
                            <div
                              key={msg.id}
                              className="rounded-lg"
                              style={{
                                padding: "6px 10px",
                                backgroundColor: "var(--bg-canvas)",
                                border: "1px solid var(--line-subtle)",
                              }}
                            >
                              <div className="flex items-center justify-between mb-0.5">
                                <span className="text-xs" style={{ color: "var(--ink-tertiary)" }}>
                                  {msg.sent ? "sent" : messageTypeLabel(msg.type)} {formatMessageDate(msg.sent_at || msg.created_at)}
                                </span>
                                {!msg.sent && (
                                  <span
                                    className="text-xs px-1.5 py-0.5 rounded"
                                    style={{
                                      backgroundColor: "var(--accent-soft)",
                                      color: "var(--accent-ink)",
                                      fontSize: "10px",
                                    }}
                                  >
                                    not sent
                                  </span>
                                )}
                              </div>
                              <p
                                className="text-xs"
                                style={{ color: "var(--ink-secondary)", lineHeight: 1.4 }}
                              >
                                {cleanPreview(msg.content)}
                              </p>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  );
                }
                const { msg, category } = item;
                return (
                  <div
                    key={msg.id}
                    className="rounded-lg"
                    style={{
                      padding: "8px 12px",
                      backgroundColor: "var(--bg-surface)",
                      border: "1px solid var(--line-subtle)",
                    }}
                  >
                    <div className="flex items-center justify-between mb-0.5">
                      <div className="flex items-center gap-2">
                        <span
                          className="text-xs font-medium px-1.5 py-0.5 rounded"
                          style={{
                            backgroundColor: "var(--bg-canvas)",
                            color: "var(--ink-tertiary)",
                            fontSize: "10px",
                            letterSpacing: "0.02em",
                          }}
                        >
                          {category}
                        </span>
                        <span className="text-xs" style={{ color: "var(--ink-tertiary)" }}>
                          {msg.sent ? "sent" : messageTypeLabel(msg.type)} {formatMessageDate(msg.sent_at || msg.created_at)}
                        </span>
                      </div>
                      {!msg.sent && (
                        <span
                          className="text-xs px-1.5 py-0.5 rounded"
                          style={{
                            backgroundColor: "var(--accent-soft)",
                            color: "var(--accent-ink)",
                            fontSize: "10px",
                          }}
                        >
                          not sent
                        </span>
                      )}
                    </div>
                    <p
                      className="text-xs note-clamp"
                      style={{ color: "var(--ink-secondary)", lineHeight: 1.4 }}
                      title={msg.content}
                    >
                      {cleanPreview(msg.content)}
                    </p>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

        </div>
      </div>
    </div>
  );
}
