"use client";

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

export default function TimePickerInput({ value, onChange }: TimePickerInputProps) {
  const { numeral, period } = formatDisplay(value || "09:00");

  return (
    <div className="relative inline-flex items-center">
      {/* Visible styled display */}
      <div
        className="flex items-baseline gap-1.5 px-4 py-2.5 rounded-[12px] cursor-pointer"
        style={{
          backgroundColor: "var(--bg-surface)",
          border: "1px solid var(--accent)",
          minWidth: "100px",
        }}
      >
        <span
          className="font-display-numerals"
          style={{
            fontSize: "24px",
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
            fontSize: "12px",
            fontWeight: 500,
            textTransform: "lowercase",
            letterSpacing: "0.03em",
            color: "var(--accent)",
            position: "relative",
            top: "-4px",
          }}
        >
          {period}
        </span>
      </div>

      {/* Invisible native time input overlaid on top — opens iOS time wheel on tap */}
      <input
        type="time"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="absolute inset-0 opacity-0 cursor-pointer"
        style={{ width: "100%", height: "100%" }}
      />
    </div>
  );
}
