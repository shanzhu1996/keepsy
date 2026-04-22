/**
 * Visual mockups used on the public landing page.
 * These are static, on-brand facsimiles of the real product UI — they show
 * prospective users what Keepsy looks like without needing real screenshots.
 */

export function TodayMockup() {
  return (
    <div
      className="rounded-[14px] p-5 mx-auto max-w-[320px] relative"
      style={{
        backgroundColor: "var(--bg-surface)",
        border: "1px solid var(--line-strong)",
        boxShadow: "var(--shadow-popover)",
      }}
    >
      {/* Decorative dots corner (subtle hint this is a preview) */}
      <div className="flex items-center justify-between mb-5">
        <div className="flex gap-1.5">
          <span className="h-2 w-2 rounded-full" style={{ backgroundColor: "var(--line-strong)" }} />
          <span className="h-2 w-2 rounded-full" style={{ backgroundColor: "var(--line-strong)" }} />
          <span className="h-2 w-2 rounded-full" style={{ backgroundColor: "var(--line-strong)" }} />
        </div>
        <span className="font-label text-[10px]" style={{ color: "var(--ink-tertiary)" }}>
          today · thu apr 23
        </span>
      </div>

      <h4
        className="font-display text-[22px] mb-5"
        style={{ color: "var(--ink-primary)", letterSpacing: "-0.01em" }}
      >
        3 lessons
      </h4>

      {/* NOW */}
      <div className="mb-5">
        <div className="flex items-center gap-1.5 mb-2">
          <span
            className="h-1.5 w-1.5 rounded-full"
            style={{
              backgroundColor: "var(--accent)",
              animation: "keepsy-pulse 2s ease-in-out infinite",
            }}
          />
          <span className="font-label text-[9px]" style={{ color: "var(--accent)" }}>
            now
          </span>
        </div>
        <div
          className="rounded-[10px] p-3 border-l-2"
          style={{
            backgroundColor: "var(--card-progress-tint)",
            borderLeftColor: "var(--accent)",
          }}
        >
          <div className="flex items-baseline gap-3">
            <span
              className="font-display-numerals text-[18px]"
              style={{ color: "var(--ink-primary)" }}
            >
              4:00
            </span>
            <span className="text-[13px]" style={{ color: "var(--ink-primary)" }}>
              Emma &middot; <span style={{ color: "var(--ink-secondary)" }}>Piano</span>
            </span>
          </div>
          <p className="text-[11px] mt-1" style={{ color: "var(--ink-tertiary)" }}>
            45 min in &middot; ends 5:00
          </p>
        </div>
      </div>

      {/* UP NEXT */}
      <div>
        <p className="font-label text-[9px] mb-2" style={{ color: "var(--ink-tertiary)" }}>
          up next
        </p>
        <div className="space-y-2">
          {[
            { time: "5:30", name: "Maya", subject: "Violin" },
            { time: "7:00", name: "Leo", subject: "Voice" },
          ].map((l) => (
            <div key={l.time} className="flex items-baseline gap-3">
              <span
                className="font-display-numerals text-[14px] w-10"
                style={{ color: "var(--ink-secondary)" }}
              >
                {l.time}
              </span>
              <span className="text-[13px]" style={{ color: "var(--ink-primary)" }}>
                {l.name}{" "}
                <span style={{ color: "var(--ink-tertiary)" }}>&middot; {l.subject}</span>
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

export function NoteMockup() {
  return (
    <div
      className="rounded-[14px] p-5 mx-auto max-w-[340px] relative"
      style={{
        backgroundColor: "var(--bg-surface)",
        border: "1px solid var(--line-strong)",
        boxShadow: "var(--shadow-popover)",
      }}
    >
      <div className="flex items-start justify-between mb-4">
        <div>
          <p className="font-label text-[9px]" style={{ color: "var(--ink-tertiary)" }}>
            lesson report · apr 21
          </p>
          <h4
            className="font-display text-[18px] mt-0.5"
            style={{ color: "var(--ink-primary)", letterSpacing: "-0.01em" }}
          >
            Emma &mdash; Piano
          </h4>
        </div>
        <span
          className="text-[10px] px-2 py-0.5 rounded-full font-medium tracking-wide"
          style={{ backgroundColor: "var(--accent-soft)", color: "var(--accent-ink)" }}
        >
          SENT
        </span>
      </div>

      <div className="space-y-3.5">
        <NoteSection
          label="covered"
          items={[
            "Bach Minuet in G — hands separate",
            "C & G major scales, 2 octaves",
          ]}
        />
        <NoteSection
          label="homework"
          items={[
            "Minuet: left hand only, 15 min/day",
            "Scales: hands together, slow tempo",
          ]}
        />
        <NoteSection
          label="next lesson"
          items={["Start measures 9–16 of Minuet"]}
        />
      </div>

      {/* AI hint badge */}
      <div
        className="mt-4 pt-3 flex items-center gap-1.5 text-[10px]"
        style={{
          borderTop: "1px solid var(--line-subtle)",
          color: "var(--ink-tertiary)",
        }}
      >
        <svg width="10" height="10" viewBox="0 0 24 24" fill="none">
          <path
            d="M12 3v2m0 14v2m9-9h-2M5 12H3m15.364-6.364l-1.414 1.414M7.05 16.95l-1.414 1.414m12.728 0l-1.414-1.414M7.05 7.05L5.636 5.636"
            stroke="currentColor"
            strokeWidth="1.5"
            strokeLinecap="round"
          />
        </svg>
        <span className="font-label" style={{ letterSpacing: "0.06em" }}>
          structured by keepsy · 42 seconds
        </span>
      </div>
    </div>
  );
}

function NoteSection({ label, items }: { label: string; items: string[] }) {
  return (
    <div>
      <p
        className="font-label text-[9px] mb-1.5"
        style={{ color: "var(--accent)" }}
      >
        {label}
      </p>
      <ul className="space-y-1">
        {items.map((item) => (
          <li
            key={item}
            className="text-[12.5px] leading-[1.5] pl-3 relative"
            style={{ color: "var(--ink-secondary)" }}
          >
            <span
              className="absolute left-0 top-[9px] w-1 h-1 rounded-full"
              style={{ backgroundColor: "var(--ink-tertiary)" }}
            />
            {item}
          </li>
        ))}
      </ul>
    </div>
  );
}
