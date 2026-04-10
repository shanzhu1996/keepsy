"use client";

import { useState } from "react";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import SMSNotification from "@/components/sms-notification";

interface StudentMessagingClientProps {
  studentName: string;
  studentPhone?: string | null;
  studentEmail?: string | null;
  studentId: string;
  nextLessonTime?: string;
  amountDue?: number;
  autoRemind: boolean;
}

export default function StudentMessagingClient({
  studentName,
  studentPhone,
  studentId,
  nextLessonTime,
  amountDue,
  autoRemind,
}: StudentMessagingClientProps) {
  const [showSMS, setShowSMS] = useState(false);
  const [smsType, setSmsType] = useState<"lesson_reminder" | "payment_reminder" | "custom">("custom");
  const [showReminderDialog, setShowReminderDialog] = useState(false);
  const [reminderMsg, setReminderMsg] = useState("");
  const [reminderHours, setReminderHours] = useState(24);
  const [generatingReminder, setGeneratingReminder] = useState(false);
  const [sendingReminder, setSendingReminder] = useState(false);
  const [reminderSent, setReminderSent] = useState(false);

  const openSMS = (type: "lesson_reminder" | "payment_reminder" | "custom") => {
    setSmsType(type);
    setShowSMS(true);
  };

  async function openReminderDialog() {
    setReminderMsg(`Hi ${studentName}! Just a reminder about your lesson tomorrow at ${nextLessonTime}. See you then!`);
    setReminderSent(false);
    setShowReminderDialog(true);
  }

  async function handleGenerateReminderAI() {
    setGeneratingReminder(true);
    try {
      const res = await fetch("/api/messages/lesson-reminder", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ studentName, lessonTime: nextLessonTime }),
      });
      if (!res.ok) throw new Error("Failed");
      const data = await res.json();
      setReminderMsg(data.message);
    } catch {
      alert("Failed to generate message");
    } finally {
      setGeneratingReminder(false);
    }
  }

  async function handleSendReminder() {
    setSendingReminder(true);
    try {
      await fetch("/api/reminders/trigger", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ studentId, hoursBeforeLesson: 48 }),
      });
      if (studentPhone && reminderMsg) {
        await fetch("/api/notifications/send-sms", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ studentPhone, message: reminderMsg }),
        });
      }
      setReminderSent(true);
      setTimeout(() => setShowReminderDialog(false), 1500);
    } catch {
      alert("Failed to send reminder");
    } finally {
      setSendingReminder(false);
    }
  }

  return (
    <div
      className="mt-4 rounded-xl px-4 py-4"
      style={{
        backgroundColor: "var(--bg-surface)",
        border: "1px solid var(--line-subtle)",
      }}
    >
      <h2
        className="font-display text-base mb-3"
        style={{ color: "var(--ink-primary)" }}
      >
        message student
      </h2>

      <div className="flex flex-wrap gap-2">
        {[
          { label: "send message", icon: "💬", type: "custom" as const, show: true },
          { label: "payment reminder", icon: "💰", type: "payment_reminder" as const, show: !!amountDue },
          { label: "auto reminder", icon: "🔔", type: null, show: autoRemind && !!nextLessonTime },
        ]
          .filter((b) => b.show)
          .map((b) => (
            <button
              key={b.label}
              onClick={() => b.type ? openSMS(b.type) : openReminderDialog()}
              className="text-sm px-3 py-1.5 rounded-lg transition-colors"
              style={{
                border: "1px solid var(--line-strong)",
                color: "var(--ink-primary)",
                backgroundColor: "transparent",
              }}
            >
              {b.icon} {b.label}
            </button>
          ))}
      </div>

      {showSMS && (
        <div className="mt-3">
          <SMSNotification
            studentName={studentName}
            studentPhone={studentPhone}
            type={smsType}
            lessonTime={nextLessonTime}
            amount={amountDue}
            onClose={() => setShowSMS(false)}
          />
        </div>
      )}

      {/* Auto Reminder dialog */}
      <Dialog open={showReminderDialog} onOpenChange={setShowReminderDialog}>
        <DialogContent className="max-w-sm" style={{ padding: 0 }}>
          <div style={{ padding: "20px 24px" }}>
            <DialogHeader>
              <DialogTitle
                className="font-display text-xl"
                style={{ color: "var(--ink-primary)" }}
              >
                auto reminder
              </DialogTitle>
            </DialogHeader>
            <div className="space-y-4 pt-3">
              <div>
                <p className="text-xs mb-1" style={{ color: "var(--ink-tertiary)" }}>
                  next lesson: <span className="font-medium" style={{ color: "var(--ink-secondary)" }}>{nextLessonTime}</span>
                </p>
                <p className="text-sm font-medium mb-2" style={{ color: "var(--ink-primary)" }}>
                  send reminder how long before?
                </p>
                <div className="flex gap-2 flex-wrap">
                  {[
                    { label: "same day", hours: 6 },
                    { label: "1 day before", hours: 24 },
                    { label: "2 days before", hours: 48 },
                    { label: "3 days before", hours: 72 },
                  ].map(({ label, hours }) => (
                    <button
                      key={hours}
                      type="button"
                      onClick={() => setReminderHours(hours)}
                      className="px-3 py-1.5 rounded-full text-sm font-medium transition-colors"
                      style={{
                        backgroundColor: reminderHours === hours ? "var(--accent-soft)" : "transparent",
                        color: reminderHours === hours ? "var(--accent-ink)" : "var(--ink-primary)",
                        border: `1px solid ${reminderHours === hours ? "var(--accent)" : "var(--line-strong)"}`,
                      }}
                    >
                      {label}
                    </button>
                  ))}
                </div>
              </div>

              <button
                className="w-full text-sm py-1.5 rounded-lg transition-colors"
                style={{
                  border: "1px solid var(--line-strong)",
                  color: "var(--ink-secondary)",
                  backgroundColor: "transparent",
                }}
                onClick={handleGenerateReminderAI}
                disabled={generatingReminder}
              >
                {generatingReminder ? "generating…" : "✨ generate with ai"}
              </button>

              <Textarea
                value={reminderMsg}
                onChange={(e) => setReminderMsg(e.target.value)}
                rows={4}
                placeholder="write a reminder message…"
              />

              {!studentPhone && (
                <p className="text-xs" style={{ color: "var(--danger)" }}>
                  no phone number — add one to send sms
                </p>
              )}
            </div>
          </div>

          {/* Sticky footer */}
          <div
            style={{
              padding: "14px 24px 20px",
              borderTop: "1px solid var(--line-strong)",
              backgroundColor: "var(--bg-canvas)",
            }}
          >
            <button
              className="w-full py-2.5 rounded-xl text-base font-medium transition-colors disabled:opacity-50"
              style={{ backgroundColor: "var(--accent)", color: "#fff" }}
              onClick={handleSendReminder}
              disabled={sendingReminder || !reminderMsg}
            >
              {reminderSent ? "sent!" : sendingReminder ? "sending…" : "send sms"}
            </button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
