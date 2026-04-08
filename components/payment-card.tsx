"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
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
  const [reminderDraft, setReminderDraft] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  async function handleMarkPaid() {
    setLoading(true);
    try {
      const res = await fetch("/api/payments/mark-paid", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ paymentId: payment.id }),
      });
      if (!res.ok) throw new Error("Failed");
      router.refresh();
    } catch {
      alert("Failed to mark as paid");
    } finally {
      setLoading(false);
    }
  }

  async function handleGenerateReminder() {
    setLoading(true);
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
      alert("Failed to generate reminder");
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
    <div className="border rounded-lg p-4">
      <div className="flex justify-between items-start">
        <div>
          {showStudent && payment.student && (
            <p className="font-semibold">{payment.student.name}</p>
          )}
          <p className="text-lg font-bold">${Number(payment.amount).toFixed(2)}</p>
          <p className="text-sm text-gray-500">
            {payment.lesson_count_covered} lessons
          </p>
          {payment.paid_at && (
            <p className="text-xs text-gray-400">
              Paid{" "}
              {new Date(payment.paid_at).toLocaleDateString()}
            </p>
          )}
        </div>
        <Badge
          variant={payment.status === "pending" ? "destructive" : "secondary"}
        >
          {payment.status}
        </Badge>
      </div>

      {payment.status === "pending" && (
        <div className="flex gap-2 mt-3">
          <Button size="sm" onClick={handleMarkPaid} disabled={loading}>
            Mark Paid
          </Button>
          <Button
            size="sm"
            variant="outline"
            onClick={handleGenerateReminder}
            disabled={loading}
          >
            Generate Reminder
          </Button>
        </div>
      )}

      {reminderDraft && (
        <div className="mt-3 bg-gray-50 p-3 rounded text-sm">
          <p>{reminderDraft}</p>
          <Button
            size="sm"
            variant="ghost"
            className="mt-2"
            onClick={handleCopy}
          >
            {copied ? "Copied!" : "Copy Message"}
          </Button>
        </div>
      )}
    </div>
  );
}
