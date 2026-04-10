"use client";

import { useEffect, useRef, useState } from "react";

interface TimePickerInputProps {
  value: string; // "HH:mm"
  onChange: (value: string) => void;
}

function splitTime(hhmm: string): { numeral: string; period: "am" | "pm" } {
  const [hStr, mStr] = hhmm.split(":");
  const h = parseInt(hStr, 10);
  const m = parseInt(mStr, 10);
  const period: "am" | "pm" = h >= 12 ? "pm" : "am";
  const h12 = h % 12 === 0 ? 12 : h % 12;
  const numeral = m === 0 ? `${h12}` : `${h12}:${String(m).padStart(2, "0")}`;
  return { numeral, period };
}

function addMinutes(hhmm: string, minutes: number): string {
  const [h, m] = hhmm.split(":").map((n) => parseInt(n, 10));
  let total = h * 60 + m + minutes;
  total = Math.max(0, Math.min(total, 23 * 60 + 30));
  const nh = Math.floor(total / 60);
  const nm = total % 60;
  return `${String(nh).padStart(2, "0")}:${String(nm).padStart(2, "0")}`;
}

function roundToHalfHour(hhmm: string): string {
  const [h, m] = hhmm.split(":").map((n) => parseInt(n, 10));
  if (m === 0 || m === 30)
    return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
  if (m < 30) return `${String(h).padStart(2, "0")}:30`;
  const nh = (h + 1) % 24;
  return `${String(nh).padStart(2, "0")}:00`;
}

export default function TimePickerInput({ value, onChange }: TimePickerInputProps) {
  // Generate ~12 half-hour slots centered on the current value, forward-biased.
  // Offsets: -60, -30, 0, +30, +60, +90, +120, +150, +180, +210, +240, +270
  const center = roundToHalfHour(value || "09:00");
  const offsets = [-60, -30, 0, 30, 60, 90, 120, 150, 180, 210, 240, 270];
  const chipsRaw = offsets.map((o) => addMinutes(center, o));
  const chips = Array.from(new Set(chipsRaw));

  const [showCustom, setShowCustom] = useState(false);
  const scrollerRef = useRef<HTMLDivElement>(null);
  const selectedRef = useRef<HTMLButtonElement>(null);

  // Auto-center the selected chip when value changes.
  useEffect(() => {
    if (selectedRef.current) {
      selectedRef.current.scrollIntoView({
        inline: "center",
        block: "nearest",
        behavior: "smooth",
      });
    }
  }, [value]);

  return (
    <div>
      <div className="relative">
        <div
          ref={scrollerRef}
          className="flex gap-2 overflow-x-auto pb-1"
          style={{
            scrollbarWidth: "none",
            WebkitOverflowScrolling: "touch",
            scrollSnapType: "x mandatory",
          }}
        >
          {chips.map((chip) => {
            const selected = chip === value;
            const { numeral, period } = splitTime(chip);
            return (
              <button
                key={chip}
                ref={selected ? selectedRef : undefined}
                type="button"
                onClick={() => {
                  setShowCustom(false);
                  onChange(chip);
                }}
                className="transition-colors focus:outline-none focus-visible:ring-1 focus-visible:ring-amber-300/70"
                style={{
                  flex: "0 0 auto",
                  scrollSnapAlign: "center",
                  padding: "8px 14px",
                  borderRadius: "10px",
                  border: selected
                    ? "1px solid var(--accent)"
                    : "1px solid var(--line-strong)",
                  backgroundColor: selected
                    ? "var(--accent-soft)"
                    : "var(--bg-surface)",
                  color: selected ? "var(--accent-ink)" : "var(--ink-primary)",
                  display: "inline-flex",
                  alignItems: "baseline",
                  gap: "3px",
                }}
              >
                <span
                  className="font-display-numerals"
                  style={{
                    fontSize: "16px",
                    fontWeight: 500,
                    letterSpacing: "-0.005em",
                    lineHeight: 1,
                  }}
                >
                  {numeral}
                </span>
                <span
                  style={{
                    fontSize: "10px",
                    fontWeight: 500,
                    textTransform: "lowercase",
                    letterSpacing: "0.04em",
                    opacity: 0.55,
                    position: "relative",
                    top: "-3px",
                  }}
                >
                  {period}
                </span>
              </button>
            );
          })}

          {/* Trailing escape chip — "Other time" */}
          <button
            type="button"
            onClick={() => setShowCustom((s) => !s)}
            className="transition-colors focus:outline-none focus-visible:ring-1 focus-visible:ring-amber-300/70"
            style={{
              flex: "0 0 auto",
              scrollSnapAlign: "center",
              padding: "8px 14px",
              borderRadius: "10px",
              border: showCustom
                ? "1px solid var(--accent)"
                : "1px solid var(--line-strong)",
              backgroundColor: showCustom
                ? "var(--accent-soft)"
                : "var(--bg-surface)",
              color: showCustom ? "var(--accent-ink)" : "var(--ink-secondary)",
              fontSize: "13px",
              fontWeight: 500,
              lineHeight: 1,
              whiteSpace: "nowrap",
            }}
          >
            Other time
          </button>
        </div>
        {/* Right-edge fade — signals scrollable */}
        <div
          aria-hidden
          style={{
            position: "absolute",
            top: 0,
            right: 0,
            bottom: 0,
            width: "32px",
            pointerEvents: "none",
            background:
              "linear-gradient(to right, rgba(244, 237, 224, 0) 0%, var(--bg-canvas) 100%)",
          }}
        />
      </div>

      {showCustom && (
        <div className="mt-2 flex items-center gap-2">
          <input
            type="time"
            value={value}
            onChange={(e) => onChange(e.target.value)}
            className="font-display-numerals focus:outline-none focus-visible:ring-1 focus-visible:ring-amber-300/70"
            style={{
              padding: "6px 10px",
              borderRadius: "8px",
              fontSize: "14px",
              border: "1px solid var(--line-strong)",
              backgroundColor: "var(--bg-canvas)",
              color: "var(--ink-primary)",
            }}
          />
        </div>
      )}
    </div>
  );
}
