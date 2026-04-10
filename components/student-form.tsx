"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Switch } from "@/components/ui/switch";
import type { Student } from "@/lib/types";

interface StudentFormProps {
  student?: Student;
  defaults?: {
    cycleLessons: number;
    cyclePrice: number | null;
  };
}

const CYCLE_OPTIONS = ["1", "4", "8", "12"];

function validateEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

function validatePhone(phone: string): boolean {
  // Allow digits, spaces, dashes, parens, dots, optional leading +
  // At least 7 digits total
  const digitsOnly = phone.replace(/\D/g, "");
  return /^[+]?[\d\s\-().]+$/.test(phone) && digitsOnly.length >= 7;
}

export default function StudentForm({ student, defaults }: StudentFormProps) {
  const router = useRouter();
  const supabase = createClient();
  const isEditing = !!student;

  const [name, setName] = useState(student?.name ?? "");
  const [email, setEmail] = useState(student?.email ?? "");
  const [phone, setPhone] = useState(student?.phone ?? "");
  const [autoRemind, setAutoRemind] = useState(student?.auto_remind ?? true);
  const initialCycle = student?.billing_cycle_lessons?.toString() ?? defaults?.cycleLessons?.toString() ?? "4";
  const [billingCycleLessons, setBillingCycleLessons] = useState(initialCycle);
  const [customCycle, setCustomCycle] = useState(
    !CYCLE_OPTIONS.includes(initialCycle)
  );
  const [cyclePrice, setCyclePrice] = useState(
    student?.cycle_price?.toString() ?? defaults?.cyclePrice?.toString() ?? ""
  );
  const [notes, setNotes] = useState(student?.notes ?? "");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  // Validation state — only show after blur
  const [emailTouched, setEmailTouched] = useState(false);
  const [phoneTouched, setPhoneTouched] = useState(false);

  const emailError = emailTouched && email && !validateEmail(email);
  const phoneError = phoneTouched && phone && !validatePhone(phone);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();

    // Final validation check
    if (email && !validateEmail(email)) {
      setError("please enter a valid email address");
      return;
    }
    if (phone && !validatePhone(phone)) {
      setError("please enter a valid phone number");
      return;
    }

    setLoading(true);
    setError("");

    const payload = {
      name,
      email: email || null,
      phone: phone || null,
      contact_method: phone ? ("sms" as const) : ("email" as const),
      billing_enabled: true,
      auto_remind: autoRemind,
      billing_cycle_lessons: parseInt(billingCycleLessons) || null,
      cycle_price: parseFloat(cyclePrice) || null,
      notes: notes || null,
      is_active: true,
      lesson_default_duration_min: null,
    };

    try {
      if (isEditing) {
        const { error } = await supabase
          .from("students")
          .update(payload)
          .eq("id", student.id);
        if (error) throw error;
        router.push(`/students/${student.id}`);
      } else {
        const {
          data: { user },
        } = await supabase.auth.getUser();
        if (!user) throw new Error("Not authenticated");

        const { data, error } = await supabase
          .from("students")
          .insert({ ...payload, user_id: user.id })
          .select()
          .single();
        if (error) throw error;
        router.push(`/students/${data.id}`);
      }
      router.refresh();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "An error occurred");
    } finally {
      setLoading(false);
    }
  }

  const inputStyle: React.CSSProperties = {
    backgroundColor: "var(--bg-surface)",
    border: "1px solid var(--line-strong)",
    color: "var(--ink-primary)",
    borderRadius: "10px",
    padding: "10px 14px",
    fontSize: "15px",
    width: "100%",
    outline: "none",
    transition: "border-color 150ms ease",
  };

  const errorInputStyle: React.CSSProperties = {
    ...inputStyle,
    borderColor: "var(--danger)",
  };

  return (
    <div className="keepsy-rise keepsy-rise-1">
      {/* Header */}
      <h1
        className="font-display text-2xl mb-6"
        style={{ color: "var(--ink-primary)" }}
      >
        {isEditing ? "edit student" : "add student"}
      </h1>

      <form onSubmit={handleSubmit} id="student-form">
        {/* Name */}
        <div className="mb-4">
          <label
            className="text-sm font-medium mb-1.5 block"
            style={{ color: "var(--ink-secondary)" }}
          >
            name <span style={{ color: "var(--ink-tertiary)" }}>*</span>
          </label>
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
            style={inputStyle}
            onFocus={(e) => (e.target.style.borderColor = "var(--accent)")}
            onBlur={(e) => (e.target.style.borderColor = "var(--line-strong)")}
            placeholder="student name"
          />
        </div>

        {/* Email */}
        <div className="mb-4">
          <label
            className="text-sm font-medium mb-1.5 block"
            style={{ color: "var(--ink-secondary)" }}
          >
            email
          </label>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            style={emailError ? errorInputStyle : inputStyle}
            onFocus={(e) => (e.target.style.borderColor = emailError ? "var(--danger)" : "var(--accent)")}
            onBlur={(e) => {
              setEmailTouched(true);
              e.target.style.borderColor = (emailTouched && email && !validateEmail(email)) ? "var(--danger)" : "var(--line-strong)";
            }}
            placeholder="email address"
          />
          {emailError && (
            <p className="text-xs mt-1" style={{ color: "var(--danger)" }}>
              doesn&apos;t look like a valid email
            </p>
          )}
        </div>

        {/* Phone */}
        <div className="mb-4">
          <label
            className="text-sm font-medium mb-1.5 block"
            style={{ color: "var(--ink-secondary)" }}
          >
            phone
          </label>
          <input
            type="tel"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            style={phoneError ? errorInputStyle : inputStyle}
            onFocus={(e) => (e.target.style.borderColor = phoneError ? "var(--danger)" : "var(--accent)")}
            onBlur={(e) => {
              setPhoneTouched(true);
              e.target.style.borderColor = (phoneTouched && phone && !validatePhone(phone)) ? "var(--danger)" : "var(--line-strong)";
            }}
            placeholder="phone number"
          />
          {phoneError && (
            <p className="text-xs mt-1" style={{ color: "var(--danger)" }}>
              please enter at least 7 digits
            </p>
          )}
        </div>

        {/* Notes */}
        <div className="mb-5">
          <label
            className="text-sm font-medium mb-1.5 block"
            style={{ color: "var(--ink-secondary)" }}
          >
            notes
          </label>
          <input
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            style={inputStyle}
            onFocus={(e) => (e.target.style.borderColor = "var(--accent)")}
            onBlur={(e) => (e.target.style.borderColor = "var(--line-strong)")}
            placeholder="any notes about this student…"
          />
        </div>

        {/* Divider */}
        <div style={{ height: "1px", backgroundColor: "var(--line-strong)", margin: "0 0 16px" }} />

        {/* Auto reminders toggle */}
        <div className="flex items-center justify-between mb-4">
          <label
            className="text-sm font-medium"
            style={{ color: "var(--ink-secondary)" }}
          >
            auto lesson reminders
          </label>
          <Switch checked={autoRemind} onCheckedChange={setAutoRemind} />
        </div>

        {/* Divider */}
        <div style={{ height: "1px", backgroundColor: "var(--line-strong)", margin: "0 0 16px" }} />

        {/* Billing */}
        <p
          className="text-xs font-medium mb-3"
          style={{ color: "var(--ink-tertiary)", letterSpacing: "0.04em", textTransform: "uppercase" }}
        >
          billing
        </p>

        <div className="mb-4">
          <label
            className="text-sm font-medium mb-2 block"
            style={{ color: "var(--ink-secondary)" }}
          >
            lessons per billing cycle
          </label>
          <div className="flex gap-2 flex-wrap">
            {CYCLE_OPTIONS.map((opt) => (
              <button
                key={opt}
                type="button"
                onClick={() => {
                  setBillingCycleLessons(opt);
                  setCustomCycle(false);
                }}
                className="px-4 py-1.5 rounded-full text-sm font-medium transition-colors"
                style={{
                  backgroundColor:
                    !customCycle && billingCycleLessons === opt
                      ? "var(--accent-soft)"
                      : "transparent",
                  color:
                    !customCycle && billingCycleLessons === opt
                      ? "var(--accent-ink)"
                      : "var(--ink-primary)",
                  border: `1px solid ${
                    !customCycle && billingCycleLessons === opt
                      ? "var(--accent)"
                      : "var(--line-strong)"
                  }`,
                }}
              >
                {opt}
              </button>
            ))}
            {customCycle ? (
              <input
                type="number"
                min="1"
                value={billingCycleLessons}
                onChange={(e) => setBillingCycleLessons(e.target.value)}
                autoFocus
                className="rounded-full text-sm font-medium text-center"
                style={{
                  width: "64px",
                  padding: "6px 12px",
                  backgroundColor: "var(--accent-soft)",
                  color: "var(--accent-ink)",
                  border: "1px solid var(--accent)",
                  outline: "none",
                }}
              />
            ) : (
              <button
                type="button"
                onClick={() => {
                  setCustomCycle(true);
                  setBillingCycleLessons("");
                }}
                className="px-4 py-1.5 rounded-full text-sm font-medium transition-colors"
                style={{
                  backgroundColor: "transparent",
                  color: "var(--ink-tertiary)",
                  border: "1px solid var(--line-strong)",
                }}
              >
                other
              </button>
            )}
          </div>
        </div>

        <div className="mb-5">
          <label
            className="text-sm font-medium mb-1.5 block"
            style={{ color: "var(--ink-secondary)" }}
          >
            {billingCycleLessons === "1" ? "price per lesson" : "price per cycle"}
          </label>
          <div className="relative">
            <span
              className="absolute left-3.5 top-1/2 -translate-y-1/2 text-sm"
              style={{ color: "var(--ink-tertiary)" }}
            >
              $
            </span>
            <input
              type="number"
              min="0"
              step="0.01"
              value={cyclePrice}
              onChange={(e) => setCyclePrice(e.target.value)}
              style={{ ...inputStyle, paddingLeft: "24px" }}
              onFocus={(e) => (e.target.style.borderColor = "var(--accent)")}
              onBlur={(e) => (e.target.style.borderColor = "var(--line-strong)")}
              placeholder={billingCycleLessons === "1" ? "85" : "340"}
            />
          </div>
          {billingCycleLessons && billingCycleLessons !== "1" && (
            <p className="text-xs mt-1" style={{ color: "var(--ink-tertiary)" }}>
              charged every {billingCycleLessons} lessons
            </p>
          )}
        </div>

        {error && (
          <p className="text-sm mb-3" style={{ color: "var(--danger)" }}>
            {error}
          </p>
        )}
      </form>

      {/* Footer */}
      <div
        style={{
          marginTop: "24px",
          paddingTop: "14px",
          borderTop: "1px solid var(--line-strong)",
          boxShadow: "0 -6px 12px -8px rgba(43,31,23,0.10)",
        }}
      >
        <div className="flex gap-3">
          <button
            type="submit"
            form="student-form"
            disabled={loading || !name.trim()}
            className="flex-1 py-2.5 rounded-xl text-base font-medium transition-colors disabled:opacity-50"
            style={{ backgroundColor: "var(--accent)", color: "#fff" }}
          >
            {loading ? "saving…" : isEditing ? "save changes" : "add student"}
          </button>
          <button
            type="button"
            onClick={() => router.back()}
            className="text-sm font-medium px-4 transition-colors"
            style={{ color: "var(--ink-secondary)" }}
          >
            cancel
          </button>
        </div>
      </div>
    </div>
  );
}
