"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
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
    // Pre-fill with default message then open dialog
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
      // Mark reminder as sent via the trigger API
      await fetch("/api/reminders/trigger", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ studentId, hoursBeforeLesson: 48 }),
      });
      // Also send the custom SMS if phone exists
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
    <div className="mt-4 bg-gray-800 rounded-xl px-4 py-4">
      <h2 className="text-base font-semibold text-white mb-3">Message Student</h2>

      <div className="flex flex-wrap gap-2">
        <Button
          size="sm"
          variant="outline"
          className="border-gray-500 text-white hover:bg-gray-700"
          onClick={() => openSMS("custom")}
        >
          💬 Send Message
        </Button>
        {amountDue && (
          <Button
            size="sm"
            variant="outline"
            className="border-gray-500 text-white hover:bg-gray-700"
            onClick={() => openSMS("payment_reminder")}
          >
            💰 Payment Reminder
          </Button>
        )}
        {autoRemind && nextLessonTime && (
          <Button
            size="sm"
            variant="outline"
            className="border-gray-500 text-white hover:bg-gray-700"
            onClick={openReminderDialog}
          >
            🔔 Auto Reminder
          </Button>
        )}
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

      {/* Auto Reminder dialog — timing picker + editable message */}
      <Dialog open={showReminderDialog} onOpenChange={setShowReminderDialog}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Auto Reminder</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 pt-1">
            <div>
              <p className="text-xs text-gray-500 mb-1">
                Next lesson: <span className="font-medium text-gray-700">{nextLessonTime}</span>
              </p>
              <p className="text-sm font-medium text-gray-900 mb-2">Send reminder how long before?</p>
              <div className="flex gap-2 flex-wrap">
                {[
                  { label: "Same day", hours: 6 },
                  { label: "1 day before", hours: 24 },
                  { label: "2 days before", hours: 48 },
                  { label: "3 days before", hours: 72 },
                ].map(({ label, hours }) => (
                  <button
                    key={hours}
                    type="button"
                    onClick={() => setReminderHours(hours)}
                    className={`px-3 py-1.5 rounded-md border text-sm font-medium transition-colors ${
                      reminderHours === hours
                        ? "bg-amber-600 text-white border-amber-600"
                        : "bg-white text-gray-700 border-gray-200 hover:border-gray-400"
                    }`}
                  >
                    {label}
                  </button>
                ))}
              </div>
            </div>

            <Button
              variant="outline"
              size="sm"
              className="w-full"
              onClick={handleGenerateReminderAI}
              disabled={generatingReminder}
            >
              {generatingReminder ? "Generating…" : "✨ Generate with AI"}
            </Button>

            <Textarea
              value={reminderMsg}
              onChange={(e) => setReminderMsg(e.target.value)}
              rows={4}
              placeholder="Write a reminder message…"
            />

            {!studentPhone && (
              <p className="text-xs text-red-500">No phone number — add one to send SMS.</p>
            )}

            <div className="flex gap-2">
              <Button
                className="flex-1"
                onClick={handleSendReminder}
                disabled={sendingReminder || !reminderMsg}
              >
                {reminderSent ? "Sent! ✓" : sendingReminder ? "Sending…" : "Send SMS"}
              </Button>
              <Button variant="outline" onClick={() => setShowReminderDialog(false)}>
                Cancel
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
