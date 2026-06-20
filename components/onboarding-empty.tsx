/** First-run state for the Now home when the teacher has no students yet.
 *  Purely presentational — shows what Keepsy produces (a sample report) and the
 *  three-step loop, then points at the one action that starts everything. */
export default function OnboardingEmpty() {
  const steps = [
    { icon: "mic", text: "Talk a few lines after a lesson" },
    { icon: "spark", text: "Keepsy writes the parent-ready report" },
    { icon: "send", text: "You glance, then send" },
  ];

  return (
    <div className="pt-2">
      <p
        style={{
          fontFamily: "var(--font-instrument), sans-serif",
          fontSize: "12px",
          fontWeight: 600,
          letterSpacing: "0.07em",
          textTransform: "uppercase",
          color: "var(--accent-ink)",
        }}
      >
        Welcome to Keepsy
      </p>
      <h2
        className="font-display"
        style={{
          fontSize: "26px",
          fontWeight: 400,
          letterSpacing: "-0.02em",
          color: "var(--ink-primary)",
          marginTop: "6px",
          lineHeight: 1.15,
        }}
      >
        Lesson notes, in ninety seconds.
      </h2>
      <p
        style={{
          fontSize: "14px",
          color: "var(--ink-secondary)",
          marginTop: "8px",
          lineHeight: 1.55,
        }}
      >
        Talk or type a few lines after class — Keepsy turns them into a report
        you can send to parents. Here&apos;s what one looks like:
      </p>

      {/* Sample output */}
      <div
        style={{
          backgroundColor: "var(--message-bg)",
          borderRadius: "14px",
          padding: "15px 16px",
          marginTop: "14px",
        }}
      >
        <p
          className="whitespace-pre-wrap"
          style={{ fontSize: "13.5px", color: "var(--ink-primary)", lineHeight: 1.6 }}
        >
          {`Hi Sofia — lovely work today! We covered the Bach Minuet (hands separate) and your C & G scales. Homework: left hand only, 15 min a day. Next time we'll start bars 9–16. See you Thursday!`}
        </p>
        <p
          style={{
            fontSize: "11px",
            color: "var(--ink-secondary)",
            marginTop: "10px",
            paddingTop: "9px",
            borderTop: "1px solid rgba(0,0,0,0.06)",
          }}
        >
          sample report · from one spoken sentence
        </p>
      </div>

      {/* Three-step loop */}
      <div className="mt-6 space-y-3">
        {steps.map((s, i) => (
          <div key={i} className="flex items-center gap-3">
            <div
              className="flex items-center justify-center shrink-0"
              style={{
                width: "30px",
                height: "30px",
                borderRadius: "50%",
                backgroundColor: "var(--accent-soft)",
                color: "var(--accent-ink)",
              }}
            >
              <StepIcon name={s.icon} />
            </div>
            <p style={{ fontSize: "14px", color: "var(--ink-secondary)" }}>
              {s.text}
            </p>
          </div>
        ))}
      </div>

      {/* CTA */}
      <a
        href="/students/new"
        className="block w-full text-center mt-7"
        style={{
          backgroundColor: "var(--accent)",
          color: "#fff",
          fontSize: "15px",
          fontWeight: 600,
          height: "50px",
          lineHeight: "50px",
          borderRadius: "var(--radius)",
          boxShadow: "var(--shadow-cta)",
          textDecoration: "none",
        }}
      >
        Add your first student
      </a>
      <p
        className="text-center mt-3"
        style={{ fontSize: "12px", color: "var(--ink-tertiary)" }}
      >
        Takes about a minute. You can add lessons right after.
      </p>
    </div>
  );
}

function StepIcon({ name }: { name: string }) {
  const common = {
    width: 15,
    height: 15,
    viewBox: "0 0 24 24",
    fill: "none",
    stroke: "currentColor",
    strokeWidth: 2,
    strokeLinecap: "round" as const,
    strokeLinejoin: "round" as const,
    "aria-hidden": true,
  };
  if (name === "mic") {
    return (
      <svg {...common}>
        <path d="M12 2a3 3 0 0 0-3 3v7a3 3 0 0 0 6 0V5a3 3 0 0 0-3-3Z" />
        <path d="M19 10v2a7 7 0 0 1-14 0v-2" />
        <line x1="12" y1="19" x2="12" y2="22" />
      </svg>
    );
  }
  if (name === "send") {
    return (
      <svg {...common}>
        <path d="M22 2 11 13" />
        <path d="M22 2 15 22l-4-9-9-4 20-7Z" />
      </svg>
    );
  }
  // spark
  return (
    <svg {...common}>
      <path d="M12 3v4M12 17v4M3 12h4M17 12h4M6 6l2 2M16 16l2 2M18 6l-2 2M8 16l-2 2" />
    </svg>
  );
}
