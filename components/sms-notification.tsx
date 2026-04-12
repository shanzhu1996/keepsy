"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface SMSNotificationProps {
  studentName: string;
  studentPhone?: string | null;
  type: "lesson_reminder" | "payment_reminder" | "custom";
  lessonTime?: string;
  amount?: number;
  onClose?: () => void;
}

export default function SMSNotification({
  studentName,
  studentPhone,
  type,
  lessonTime,
  amount,
  onClose,
}: SMSNotificationProps) {
  const [template, setTemplate] = useState<string>(type);
  const [editableMessage, setEditableMessage] = useState("");
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);

  const defaultTemplates: Record<string, string> = {
    lesson_reminder: `Hi ${studentName}! Just a reminder about your lesson on ${lessonTime}. See you then!`,
    payment_reminder: `Hi ${studentName}! Your payment of $${amount} for your last lessons is due. Let me know if you have any questions!`,
    custom: "",
  };

  // When template changes, reset the editable message to the default
  function handleTemplateChange(t: string) {
    setTemplate(t);
    setEditableMessage(defaultTemplates[t] ?? "");
  }

  // Pre-fill on first render if not custom
  if (!editableMessage && template !== "custom") {
    // no-op — user starts with empty, then edits or generates
  }

  const hasTwilio = process.env.NEXT_PUBLIC_SUPABASE_URL; // Placeholder check

  const handleGenerateAI = async () => {
    setLoading(true);
    try {
      const endpoint =
        template === "payment_reminder"
          ? "/api/messages/payment-reminder"
          : "/api/messages/lesson-reminder";
      const res = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ studentName, lessonTime, amount }),
      });
      if (!res.ok) throw new Error("Failed to generate");
      const data = await res.json();
      setEditableMessage(data.message);
    } catch {
      alert("Failed to generate message");
    } finally {
      setLoading(false);
    }
  };

  const handleSendSMS = async () => {
    if (!studentPhone) {
      alert("No phone number on file for this student");
      return;
    }
    const msgToSend = editableMessage || defaultTemplates[template] || "";
    if (!msgToSend) return;

    setLoading(true);
    try {
      const res = await fetch("/api/notifications/send-sms", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ studentPhone, message: msgToSend }),
      });
      if (!res.ok) throw new Error("Failed to send");
      setSent(true);
      setTimeout(() => {
        setSent(false);
        onClose?.();
      }, 2000);
    } catch {
      alert("Failed to send SMS. Make sure Twilio is configured.");
    } finally {
      setLoading(false);
    }
  };

  const displayMessage = editableMessage || defaultTemplates[template] || "";

  return (
    <div className="space-y-4 p-4 bg-blue-50 rounded-lg border border-blue-200">
      <h3 className="font-semibold text-gray-900">Send SMS to {studentName}</h3>

      <div>
        <label className="text-sm font-medium text-gray-900 block mb-2">Template</label>
        <Select value={template} onValueChange={handleTemplateChange}>
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="lesson_reminder">Lesson Reminder</SelectItem>
            <SelectItem value="payment_reminder">Payment Reminder</SelectItem>
            <SelectItem value="custom">Custom Message</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {template !== "custom" && (
        <Button
          onClick={handleGenerateAI}
          disabled={loading}
          variant="outline"
          className="w-full"
        >
          {loading ? "Generating..." : "Generate with AI"}
        </Button>
      )}

      {/* Editable message — user can tweak before sending */}
      <div>
        <label className="text-sm font-medium text-gray-900 block mb-1">
          Message <span className="text-gray-400 font-normal">(edit before sending)</span>
        </label>
        <Textarea
          value={displayMessage}
          onChange={(e) => setEditableMessage(e.target.value)}
          placeholder={template === "custom" ? "Write your message..." : "Use the template above or generate with AI…"}
          rows={4}
        />
      </div>

      {studentPhone && (
        <div className="flex gap-2">
          <Button
            onClick={handleSendSMS}
            disabled={loading || !displayMessage}
            className="flex-1"
          >
            {sent ? "Sent!" : loading ? "Sending..." : "Send SMS"}
          </Button>
          {onClose && (
            <Button onClick={onClose} variant="outline">
              Close
            </Button>
          )}
        </div>
      )}

      {!studentPhone && (
        <p className="text-sm text-red-600">
          No phone number on file. Add one in student settings to send SMS.
        </p>
      )}

      {!hasTwilio && (
        <p className="text-sm text-amber-600">
          Twilio not configured. SMS will not send until credentials are added to .env.local
        </p>
      )}
    </div>
  );
}
