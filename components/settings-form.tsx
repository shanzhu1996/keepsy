"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import type { TeacherProfile } from "@/lib/settings";

interface SettingsFormProps {
  profile: TeacherProfile | null;
}

const DURATION_OPTIONS = ["30", "45", "60", "90"];
const CYCLE_OPTIONS = ["1", "4", "8", "12"];

export default function SettingsForm({ profile }: SettingsFormProps) {
  const router = useRouter();
  const supabase = createClient();

  const [name, setName] = useState(profile?.name ?? "");
  const [defaultDuration, setDefaultDuration] = useState(
    profile?.default_duration_min?.toString() ?? "60"
  );
  const [customDuration, setCustomDuration] = useState(
    !DURATION_OPTIONS.includes(profile?.default_duration_min?.toString() ?? "60")
  );
  const [hourlyRate, setHourlyRate] = useState(
    profile?.default_hourly_rate?.toString() ?? ""
  );
  const [defaultCycleLessons, setDefaultCycleLessons] = useState(
    profile?.default_cycle_lessons?.toString() ?? "4"
  );
  const [customCycle, setCustomCycle] = useState(
    !CYCLE_OPTIONS.includes(profile?.default_cycle_lessons?.toString() ?? "4")
  );
  const [defaultCyclePrice, setDefaultCyclePrice] = useState(
    profile?.default_cycle_price?.toString() ?? ""
  );
  const [timezone, setTimezone] = useState(
    profile?.timezone ?? Intl.DateTimeFormat().resolvedOptions().timeZone
  );
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState("");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError("");

    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      const payload = {
        name: name || null,
        default_duration_min: parseInt(defaultDuration) || 60,
        default_hourly_rate: hourlyRate ? parseFloat(hourlyRate) : null,
        default_cycle_lessons: parseInt(defaultCycleLessons) || null,
        default_cycle_price: defaultCyclePrice ? parseFloat(defaultCyclePrice) : null,
        timezone,
      };

      const { error } = await supabase
        .from("teacher_profiles")
        .upsert(
          { user_id: user.id, ...payload, updated_at: new Date().toISOString() },
          { onConflict: "user_id" }
        );

      if (error) throw error;

      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
      router.refresh();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to save");
    } finally {
      setSaving(false);
    }
  }

  async function handleSignOut() {
    await supabase.auth.signOut();
    router.push("/login");
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

  return (
    <div className="keepsy-rise keepsy-rise-1">
      <h1
        className="font-display text-2xl mb-6"
        style={{ color: "var(--ink-primary)" }}
      >
        settings
      </h1>

      <form onSubmit={handleSubmit}>
        {/* Profile */}
        <div className="mb-4">
          <label className="text-sm font-medium mb-1.5 block" style={{ color: "var(--ink-secondary)" }}>
            your name
          </label>
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            style={inputStyle}
            onFocus={(e) => (e.target.style.borderColor = "var(--accent)")}
            onBlur={(e) => (e.target.style.borderColor = "var(--line-strong)")}
            placeholder="e.g. Sarah Chen"
          />
        </div>

        <div className="mb-5">
          <label className="text-sm font-medium mb-1.5 block" style={{ color: "var(--ink-secondary)" }}>
            timezone
          </label>
          <input
            value={timezone}
            onChange={(e) => setTimezone(e.target.value)}
            style={inputStyle}
            onFocus={(e) => (e.target.style.borderColor = "var(--accent)")}
            onBlur={(e) => (e.target.style.borderColor = "var(--line-strong)")}
          />
          <p className="text-xs mt-1" style={{ color: "var(--ink-tertiary)" }}>
            detected: {Intl.DateTimeFormat().resolvedOptions().timeZone}
          </p>
        </div>

        <div style={{ height: "1px", backgroundColor: "var(--line-strong)", margin: "0 0 16px" }} />

        {/* Lesson defaults */}
        <p
          className="text-xs font-medium mb-3"
          style={{ color: "var(--ink-tertiary)", letterSpacing: "0.04em", textTransform: "uppercase" }}
        >
          lesson defaults
        </p>

        <div className="mb-4">
          <label className="text-sm font-medium mb-2 block" style={{ color: "var(--ink-secondary)" }}>
            default duration
          </label>
          <div className="flex gap-2 flex-wrap">
            {DURATION_OPTIONS.map((opt) => (
              <button
                key={opt}
                type="button"
                onClick={() => { setDefaultDuration(opt); setCustomDuration(false); }}
                className="px-4 py-1.5 rounded-full text-sm font-medium transition-colors"
                style={{
                  backgroundColor: !customDuration && defaultDuration === opt ? "var(--accent-soft)" : "transparent",
                  color: !customDuration && defaultDuration === opt ? "var(--accent-ink)" : "var(--ink-primary)",
                  border: `1px solid ${!customDuration && defaultDuration === opt ? "var(--accent)" : "var(--line-strong)"}`,
                }}
              >
                {opt} min
              </button>
            ))}
            {customDuration ? (
              <input
                type="number" min="15" step="15"
                value={defaultDuration}
                onChange={(e) => setDefaultDuration(e.target.value)}
                autoFocus
                className="rounded-full text-sm font-medium text-center"
                style={{
                  width: "72px", padding: "6px 12px",
                  backgroundColor: "var(--accent-soft)", color: "var(--accent-ink)",
                  border: "1px solid var(--accent)", outline: "none",
                }}
              />
            ) : (
              <button
                type="button"
                onClick={() => { setCustomDuration(true); setDefaultDuration(""); }}
                className="px-4 py-1.5 rounded-full text-sm font-medium transition-colors"
                style={{ backgroundColor: "transparent", color: "var(--ink-tertiary)", border: "1px solid var(--line-strong)" }}
              >
                other
              </button>
            )}
          </div>
        </div>

        <div className="mb-5">
          <label className="text-sm font-medium mb-1.5 block" style={{ color: "var(--ink-secondary)" }}>
            default hourly rate
          </label>
          <div className="relative" style={{ maxWidth: "160px" }}>
            <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-sm" style={{ color: "var(--ink-tertiary)" }}>$</span>
            <input
              type="number" min="0" step="0.01"
              value={hourlyRate}
              onChange={(e) => setHourlyRate(e.target.value)}
              style={{ ...inputStyle, paddingLeft: "24px" }}
              onFocus={(e) => (e.target.style.borderColor = "var(--accent)")}
              onBlur={(e) => (e.target.style.borderColor = "var(--line-strong)")}
            />
          </div>
          <p className="text-xs mt-1" style={{ color: "var(--ink-tertiary)" }}>
            reference when setting per-student billing
          </p>
        </div>

        <div style={{ height: "1px", backgroundColor: "var(--line-strong)", margin: "0 0 16px" }} />

        {/* Billing defaults */}
        <p
          className="text-xs font-medium mb-3"
          style={{ color: "var(--ink-tertiary)", letterSpacing: "0.04em", textTransform: "uppercase" }}
        >
          billing defaults
        </p>
        <p className="text-xs mb-4" style={{ color: "var(--ink-tertiary)" }}>
          pre-fills when adding new students
        </p>

        <div className="mb-4">
          <label className="text-sm font-medium mb-2 block" style={{ color: "var(--ink-secondary)" }}>
            lessons per cycle
          </label>
          <div className="flex gap-2 flex-wrap">
            {CYCLE_OPTIONS.map((opt) => (
              <button
                key={opt}
                type="button"
                onClick={() => { setDefaultCycleLessons(opt); setCustomCycle(false); }}
                className="px-4 py-1.5 rounded-full text-sm font-medium transition-colors"
                style={{
                  backgroundColor: !customCycle && defaultCycleLessons === opt ? "var(--accent-soft)" : "transparent",
                  color: !customCycle && defaultCycleLessons === opt ? "var(--accent-ink)" : "var(--ink-primary)",
                  border: `1px solid ${!customCycle && defaultCycleLessons === opt ? "var(--accent)" : "var(--line-strong)"}`,
                }}
              >
                {opt}
              </button>
            ))}
            {customCycle ? (
              <input
                type="number" min="1"
                value={defaultCycleLessons}
                onChange={(e) => setDefaultCycleLessons(e.target.value)}
                autoFocus
                className="rounded-full text-sm font-medium text-center"
                style={{
                  width: "64px", padding: "6px 12px",
                  backgroundColor: "var(--accent-soft)", color: "var(--accent-ink)",
                  border: "1px solid var(--accent)", outline: "none",
                }}
              />
            ) : (
              <button
                type="button"
                onClick={() => { setCustomCycle(true); setDefaultCycleLessons(""); }}
                className="px-4 py-1.5 rounded-full text-sm font-medium transition-colors"
                style={{ backgroundColor: "transparent", color: "var(--ink-tertiary)", border: "1px solid var(--line-strong)" }}
              >
                other
              </button>
            )}
          </div>
        </div>

        <div className="mb-5">
          <label className="text-sm font-medium mb-1.5 block" style={{ color: "var(--ink-secondary)" }}>
            price per cycle
          </label>
          <div className="relative" style={{ maxWidth: "160px" }}>
            <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-sm" style={{ color: "var(--ink-tertiary)" }}>$</span>
            <input
              type="number" min="0" step="0.01"
              value={defaultCyclePrice}
              onChange={(e) => setDefaultCyclePrice(e.target.value)}
              style={{ ...inputStyle, paddingLeft: "24px" }}
              onFocus={(e) => (e.target.style.borderColor = "var(--accent)")}
              onBlur={(e) => (e.target.style.borderColor = "var(--line-strong)")}
            />
          </div>
        </div>

        {error && (
          <p className="text-sm mb-3" style={{ color: "var(--danger)" }}>{error}</p>
        )}

        {/* Save */}
        <div style={{ marginTop: "24px", paddingTop: "14px", borderTop: "1px solid var(--line-strong)" }}>
          <button
            type="submit"
            disabled={saving}
            className="w-full py-2.5 rounded-xl text-base font-medium transition-colors disabled:opacity-50"
            style={{ backgroundColor: "var(--accent)", color: "#fff" }}
          >
            {saved ? "saved!" : saving ? "saving…" : "save settings"}
          </button>
        </div>
      </form>

      {/* Account section */}
      <div style={{ marginTop: "32px", paddingTop: "16px", borderTop: "1px solid var(--line-strong)" }}>
        <p
          className="text-xs font-medium mb-3"
          style={{ color: "var(--ink-tertiary)", letterSpacing: "0.04em", textTransform: "uppercase" }}
        >
          account
        </p>
        <p className="text-sm mb-3" style={{ color: "var(--ink-secondary)" }}>
          signed in as <span className="font-medium" style={{ color: "var(--ink-primary)" }}>{profile?.email ?? "—"}</span>
        </p>
        <button
          onClick={handleSignOut}
          className="text-sm font-medium transition-colors"
          style={{ color: "var(--danger)", textDecoration: "underline", textUnderlineOffset: "3px" }}
        >
          sign out
        </button>
      </div>
    </div>
  );
}
