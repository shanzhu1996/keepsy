"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import type { TeacherProfile } from "@/lib/settings";

interface SettingsFormProps {
  profile: TeacherProfile | null;
  authEmail: string | null;
}

const DURATION_OPTIONS = ["30", "45", "60", "90"];
const CYCLE_OPTIONS = ["1", "4", "8", "12"];

export default function SettingsForm({ profile, authEmail }: SettingsFormProps) {
  const router = useRouter();
  const supabase = createClient();
  const detectedTz = Intl.DateTimeFormat().resolvedOptions().timeZone;
  const hasProfile = !!profile?.name;

  const [editing, setEditing] = useState(!hasProfile);

  // Form state
  const [name, setName] = useState(profile?.name ?? "");
  const [defaultDuration, setDefaultDuration] = useState(
    profile?.default_duration_min?.toString() ?? "60"
  );
  const [customDuration, setCustomDuration] = useState(
    !DURATION_OPTIONS.includes(profile?.default_duration_min?.toString() ?? "60")
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
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  // Display values
  const displayDuration = `${profile?.default_duration_min ?? 60} min`;
  const cycleLessons = profile?.default_cycle_lessons ?? 4;
  const cyclePrice = profile?.default_cycle_price;
  const billingLabel =
    cycleLessons === 1
      ? cyclePrice ? `$${cyclePrice} per lesson` : "per lesson"
      : cyclePrice
        ? `$${cyclePrice} every ${cycleLessons} lessons`
        : `every ${cycleLessons} lessons`;

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

  function handleCancel() {
    setName(profile?.name ?? "");
    setDefaultDuration(profile?.default_duration_min?.toString() ?? "60");
    setCustomDuration(!DURATION_OPTIONS.includes(profile?.default_duration_min?.toString() ?? "60"));
    setDefaultCycleLessons(profile?.default_cycle_lessons?.toString() ?? "4");
    setCustomCycle(!CYCLE_OPTIONS.includes(profile?.default_cycle_lessons?.toString() ?? "4"));
    setDefaultCyclePrice(profile?.default_cycle_price?.toString() ?? "");
    setError("");
    setEditing(false);
  }

  async function handleSave() {
    setSaving(true);
    setError("");

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      const { error } = await supabase
        .from("teacher_profiles")
        .upsert(
          {
            user_id: user.id,
            name: name || null,
            default_duration_min: parseInt(defaultDuration) || 60,
            default_cycle_lessons: parseInt(defaultCycleLessons) || null,
            default_cycle_price: defaultCyclePrice ? parseFloat(defaultCyclePrice) : null,
            timezone: detectedTz,
            updated_at: new Date().toISOString(),
          },
          { onConflict: "user_id" }
        );

      if (error) throw error;
      setEditing(false);
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

  /* ─── View mode ─── */
  if (!editing) {
    return (
      <div className="keepsy-rise keepsy-rise-1">
        <div className="flex items-baseline justify-between mb-6">
          <h1 className="font-display text-2xl" style={{ color: "var(--ink-primary)" }}>
            settings
          </h1>
          <button
            onClick={() => setEditing(true)}
            className="text-xs font-medium"
            style={{
              color: "var(--accent)",
              textDecoration: "underline",
              textUnderlineOffset: "3px",
              textDecorationThickness: "1px",
            }}
          >
            edit
          </button>
        </div>

        <SettingRow label="name" value={profile?.name || "not set"} />

        <Divider />

        <SectionHeader>defaults</SectionHeader>
        <SettingRow label="duration" value={displayDuration} />
        <SettingRow label="billing" value={billingLabel} />

        <Divider />

        <SectionHeader>account</SectionHeader>
        <SettingRow label="email" value={authEmail ?? "—"} />
        <SettingRow
          label="timezone"
          value={(profile?.timezone ?? detectedTz).replace(/_/g, " ")}
        />

        {/* Feedback + Sign out */}
        <div className="mt-8 mb-4 space-y-4">
          <a
            href="mailto:hello@keepsy.app"
            className="text-[12px] block"
            style={{
              color: "var(--ink-tertiary)",
            }}
          >
            questions or feedback? <span style={{ color: "var(--accent)" }}>hello@keepsy.app</span>
          </a>
          <button
            onClick={handleSignOut}
            className="text-xs font-medium transition-colors"
            style={{
              color: "var(--ink-tertiary)",
              textDecoration: "underline",
              textUnderlineOffset: "3px",
            }}
            onMouseEnter={(e) => (e.currentTarget.style.color = "var(--danger)")}
            onMouseLeave={(e) => (e.currentTarget.style.color = "var(--ink-tertiary)")}
          >
            sign out
          </button>
        </div>
      </div>
    );
  }

  /* ─── Edit mode ─── */
  return (
    <div className="keepsy-rise keepsy-rise-1">
      <h1
        className="font-display text-2xl mb-6"
        style={{ color: "var(--ink-primary)" }}
      >
        settings
      </h1>

      {/* Name */}
      <div className="mb-5">
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
          autoFocus
        />
      </div>

      <Divider />

      {/* Duration */}
      <SectionHeader>defaults</SectionHeader>

      <div className="mb-5">
        <label className="text-sm font-medium mb-2 block" style={{ color: "var(--ink-secondary)" }}>
          lesson duration
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

      {/* Billing cycle */}
      <div className="mb-4">
        <label className="text-sm font-medium mb-2 block" style={{ color: "var(--ink-secondary)" }}>
          lessons per billing cycle
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

      {/* Price */}
      <div className="mb-5">
        <label className="text-sm font-medium mb-1.5 block" style={{ color: "var(--ink-secondary)" }}>
          {defaultCycleLessons === "1" ? "price per lesson" : "price per cycle"}
        </label>
        <div className="relative">
          <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-sm" style={{ color: "var(--ink-tertiary)" }}>$</span>
          <input
            type="number" min="0" step="0.01"
            value={defaultCyclePrice}
            onChange={(e) => setDefaultCyclePrice(e.target.value)}
            style={{ ...inputStyle, paddingLeft: "24px" }}
            onFocus={(e) => (e.target.style.borderColor = "var(--accent)")}
            onBlur={(e) => (e.target.style.borderColor = "var(--line-strong)")}
            placeholder={defaultCycleLessons === "1" ? "85" : "340"}
          />
        </div>
        <p className="text-xs mt-1" style={{ color: "var(--ink-tertiary)" }}>
          pre-fills when adding new students
        </p>
      </div>

      <Divider />

      {/* Timezone — read-only, auto-detected */}
      <div className="mb-5">
        <label className="text-sm font-medium mb-1.5 block" style={{ color: "var(--ink-secondary)" }}>
          timezone
        </label>
        <p className="text-[14px]" style={{ color: "var(--ink-primary)" }}>
          {(profile?.timezone ?? detectedTz).replace(/_/g, " ")}
        </p>
        <p className="text-[11px] mt-1" style={{ color: "var(--ink-tertiary)" }}>
          detected from your browser
        </p>
      </div>

      {error && (
        <p className="text-sm mb-3" style={{ color: "var(--danger)" }}>{error}</p>
      )}

      {/* Save / Cancel */}
      <div className="flex items-center gap-3 mt-4">
        <button
          onClick={handleSave}
          disabled={saving}
          className="text-sm font-medium transition-colors disabled:opacity-50"
          style={{
            color: "var(--accent)",
            textDecoration: "underline",
            textUnderlineOffset: "3px",
            textDecorationThickness: "1px",
          }}
        >
          {saving ? "saving…" : "save"}
        </button>
        {hasProfile && (
          <button
            onClick={handleCancel}
            className="text-sm"
            style={{ color: "var(--ink-tertiary)" }}
          >
            cancel
          </button>
        )}
      </div>
    </div>
  );
}

/* ─── Helpers ─── */

function SettingRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between items-baseline py-2.5">
      <span className="text-sm" style={{ color: "var(--ink-tertiary)" }}>{label}</span>
      <span className="text-sm font-medium" style={{ color: "var(--ink-primary)" }}>{value}</span>
    </div>
  );
}

function SectionHeader({ children }: { children: React.ReactNode }) {
  return (
    <p
      className="text-xs font-medium mb-2"
      style={{ color: "var(--ink-tertiary)", letterSpacing: "0.04em", textTransform: "uppercase" }}
    >
      {children}
    </p>
  );
}

function Divider() {
  return <div style={{ height: "1px", backgroundColor: "var(--line-strong)", margin: "4px 0 16px" }} />;
}
