"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { createPortal } from "react-dom";

interface TimePickerInputProps {
  value: string; // "HH:mm"
  onChange: (value: string) => void;
}

function formatDisplay(hhmm: string): { numeral: string; period: string } {
  const [hStr, mStr] = hhmm.split(":");
  const h = parseInt(hStr, 10);
  const m = parseInt(mStr, 10);
  const period = h >= 12 ? "pm" : "am";
  const h12 = h % 12 === 0 ? 12 : h % 12;
  const numeral = m === 0 ? `${h12}` : `${h12}:${String(m).padStart(2, "0")}`;
  return { numeral, period };
}

function parse24(hhmm: string) {
  const [hStr, mStr] = hhmm.split(":");
  return { h24: parseInt(hStr, 10), m: parseInt(mStr, 10) };
}

function to24(h12: number, period: "am" | "pm"): number {
  if (period === "am") return h12 === 12 ? 0 : h12;
  return h12 === 12 ? 12 : h12 + 12;
}

/* ── Scroll-wheel column ── */
const ITEM_H = 32;

function WheelColumn({
  items,
  selected,
  onSelect,
}: {
  items: string[];
  selected: number;
  onSelect: (i: number) => void;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const suppressSnap = useRef(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    suppressSnap.current = true;
    el.scrollTop = selected * ITEM_H;
    const t = setTimeout(() => { suppressSnap.current = false; }, 100);
    return () => clearTimeout(t);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const snapTimer = useRef<ReturnType<typeof setTimeout>>();
  const handleScroll = useCallback(() => {
    if (snapTimer.current) clearTimeout(snapTimer.current);
    snapTimer.current = setTimeout(() => {
      const el = ref.current;
      if (!el || suppressSnap.current) return;
      const idx = Math.round(el.scrollTop / ITEM_H);
      const clamped = Math.max(0, Math.min(items.length - 1, idx));
      el.scrollTo({ top: clamped * ITEM_H, behavior: "smooth" });
      if (clamped !== selected) onSelect(clamped);
    }, 80);
  }, [items.length, selected, onSelect]);

  return (
    <div
      ref={ref}
      onScroll={handleScroll}
      className="time-wheel-col"
      style={{
        height: ITEM_H * 3,
        overflowY: "auto",
        scrollSnapType: "y mandatory",
        WebkitOverflowScrolling: "touch",
      }}
    >
      <div style={{ height: ITEM_H }} />
      {items.map((item, i) => {
        const isSel = i === selected;
        return (
          <button
            key={item}
            type="button"
            onClick={() => {
              onSelect(i);
              ref.current?.scrollTo({ top: i * ITEM_H, behavior: "smooth" });
            }}
            style={{
              height: ITEM_H,
              scrollSnapAlign: "center",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              width: "100%",
              border: "none",
              background: "none",
              cursor: "pointer",
              fontSize: isSel ? "14px" : "12px",
              fontWeight: isSel ? 600 : 400,
              color: isSel ? "var(--accent-ink)" : "var(--ink-tertiary)",
              opacity: isSel ? 1 : 0.55,
              transition: "all 0.15s ease",
              fontFamily: "var(--font-display-numerals), var(--font-sans)",
              letterSpacing: "-0.01em",
            }}
          >
            {item}
          </button>
        );
      })}
      <div style={{ height: ITEM_H }} />
    </div>
  );
}

/* ── Portal dropdown ── */
function TimeDropdown({
  anchorRef,
  h12,
  minute,
  period,
  onChangeH,
  onChangeM,
  onChangeP,
  onClose,
}: {
  anchorRef: React.RefObject<HTMLDivElement | null>;
  h12: number;
  minute: number;
  period: "am" | "pm";
  onChangeH: (h: number) => void;
  onChangeM: (m: number) => void;
  onChangeP: (p: "am" | "pm") => void;
  onClose: () => void;
}) {
  const dropdownRef = useRef<HTMLDivElement>(null);
  const [pos, setPos] = useState({ top: 0, left: 0 });

  const hours = Array.from({ length: 12 }, (_, i) => i + 1);
  const minutes = Array.from({ length: 12 }, (_, i) => i * 5);

  // Position relative to anchor
  useEffect(() => {
    const anchor = anchorRef.current;
    if (!anchor) return;
    const rect = anchor.getBoundingClientRect();
    setPos({
      top: rect.bottom + 4,
      left: rect.left,
    });
  }, [anchorRef]);

  // Close on outside click
  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (
        dropdownRef.current && !dropdownRef.current.contains(e.target as Node) &&
        anchorRef.current && !anchorRef.current.contains(e.target as Node)
      ) {
        onClose();
      }
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, [anchorRef, onClose]);

  return createPortal(
    <div
      ref={dropdownRef}
      style={{
        position: "fixed",
        top: pos.top,
        left: pos.left,
        zIndex: 9999,
        backgroundColor: "var(--bg-surface)",
        border: "1px solid var(--line-strong)",
        borderRadius: "12px",
        boxShadow: "0 6px 24px rgba(0,0,0,0.10), 0 2px 6px rgba(0,0,0,0.04)",
        overflow: "hidden",
        animation: "time-picker-in 0.15s ease-out",
      }}
    >
      {/* Selection band */}
      <div
        style={{
          position: "absolute",
          top: ITEM_H,
          left: 6,
          right: 6,
          height: ITEM_H,
          backgroundColor: "var(--accent-soft)",
          borderRadius: "6px",
          pointerEvents: "none",
          zIndex: 0,
        }}
      />

      <div className="flex relative" style={{ zIndex: 1 }}>
        <div style={{ width: 48 }}>
          <WheelColumn
            items={hours.map(String)}
            selected={hours.indexOf(h12)}
            onSelect={(i) => onChangeH(hours[i])}
          />
        </div>
        <div style={{ width: 1, alignSelf: "stretch", background: "var(--line-subtle)" }} />
        <div style={{ width: 48 }}>
          <WheelColumn
            items={minutes.map((v) => String(v).padStart(2, "0"))}
            selected={(() => {
              const nearest = Math.round(minute / 5) * 5;
              return minutes.indexOf(nearest >= 60 ? 0 : nearest);
            })()}
            onSelect={(i) => onChangeM(minutes[i])}
          />
        </div>
        <div style={{ width: 1, alignSelf: "stretch", background: "var(--line-subtle)" }} />
        <div style={{ width: 44 }}>
          <WheelColumn
            items={["AM", "PM"]}
            selected={period === "am" ? 0 : 1}
            onSelect={(i) => onChangeP(i === 0 ? "am" : "pm")}
          />
        </div>
      </div>
    </div>,
    document.body
  );
}

/* ── Main component ── */
export default function TimePickerInput({ value, onChange }: TimePickerInputProps) {
  const { numeral, period } = formatDisplay(value || "09:00");
  const [open, setOpen] = useState(false);
  const [isTouchDevice, setIsTouchDevice] = useState(false);
  const buttonRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setIsTouchDevice("ontouchstart" in window && /iPhone|iPad|Android/i.test(navigator.userAgent));
  }, []);

  const { h24, m } = parse24(value || "09:00");
  const currentH12 = h24 % 12 === 0 ? 12 : h24 % 12;
  const currentPeriod: "am" | "pm" = h24 >= 12 ? "pm" : "am";

  function emit(h12: number, min: number, p: "am" | "pm") {
    const h = to24(h12, p);
    onChange(`${String(h).padStart(2, "0")}:${String(min).padStart(2, "0")}`);
  }

  return (
    <div className="relative inline-flex items-center">
      {/* Visible styled display */}
      <div
        ref={buttonRef}
        className="flex items-baseline gap-1 px-3 py-1.5 rounded-[10px] cursor-pointer"
        style={{
          backgroundColor: "var(--bg-surface)",
          border: "1px solid var(--accent)",
        }}
        onClick={() => {
          if (!isTouchDevice) setOpen((v) => !v);
        }}
      >
        <span
          className="font-display-numerals"
          style={{
            fontSize: "17px",
            fontWeight: 500,
            letterSpacing: "-0.01em",
            lineHeight: 1,
            color: "var(--accent-ink)",
          }}
        >
          {numeral}
        </span>
        <span
          style={{
            fontSize: "11px",
            fontWeight: 500,
            textTransform: "lowercase",
            letterSpacing: "0.03em",
            color: "var(--accent)",
            position: "relative",
            top: "-2px",
          }}
        >
          {period}
        </span>
      </div>

      {/* On touch devices: invisible native input for iOS time wheel */}
      {isTouchDevice && (
        <input
          type="time"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="absolute inset-0 opacity-0 cursor-pointer"
          style={{ width: "100%", height: "100%" }}
        />
      )}

      {/* On desktop: portal dropdown */}
      {!isTouchDevice && open && (
        <TimeDropdown
          anchorRef={buttonRef}
          h12={currentH12}
          minute={m}
          period={currentPeriod}
          onChangeH={(h) => emit(h, m, currentPeriod)}
          onChangeM={(min) => emit(currentH12, min, currentPeriod)}
          onChangeP={(p) => emit(currentH12, m, p)}
          onClose={() => setOpen(false)}
        />
      )}

      <style jsx global>{`
        @keyframes time-picker-in {
          from { opacity: 0; transform: translateY(-3px); }
          to { opacity: 1; transform: translateY(0); }
        }
        .time-wheel-col::-webkit-scrollbar { display: none; }
        .time-wheel-col { -ms-overflow-style: none; scrollbar-width: none; }
      `}</style>
    </div>
  );
}
