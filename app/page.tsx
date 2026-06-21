import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { PublicShell } from "@/components/public-shell";
import LandingTryDemo from "@/components/landing-try-demo";

export default async function Home() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  // Logged-in users get their dashboard, not the marketing page.
  if (user) redirect("/today");

  return (
    <PublicShell loggedIn={false}>
      {/* ─── Hero ─── */}
      <section className="px-6 pt-16 pb-6 sm:pt-20">
        <div className="max-w-2xl mx-auto text-center">
          <p
            className="font-label keepsy-rise keepsy-rise-1 mb-5"
            style={{ color: "var(--accent)" }}
          >
            for private lesson teachers
          </p>
          <h1
            className="font-display text-[38px] sm:text-[54px] leading-[1.04] mb-5 keepsy-rise keepsy-rise-2"
            style={{ color: "var(--ink-primary)", letterSpacing: "-0.02em" }}
          >
            Keep your teaching<br />easy-peasy.
          </h1>
          <p
            className="text-[16px] sm:text-[17px] leading-relaxed mb-4 keepsy-rise keepsy-rise-3 max-w-xl mx-auto"
            style={{ color: "var(--ink-secondary)" }}
          >
            Talk for ninety seconds after class &mdash; and the note writes itself, ready to send.
          </p>
          <p
            className="text-[12.5px] keepsy-rise keepsy-rise-3 flex items-center justify-center gap-1.5"
            style={{ color: "var(--ink-tertiary)" }}
          >
            <svg
              width="13"
              height="13"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.8"
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden="true"
            >
              <path d="M19 14c1.49-1.46 3-3.21 3-5.5A5.5 5.5 0 0 0 16.5 3c-1.76 0-3 .5-4.5 2-1.5-1.5-2.74-2-4.5-2A5.5 5.5 0 0 0 2 8.5c0 2.29 1.51 4.04 3 5.5l7 7Z" />
            </svg>
            built by a teacher, for teachers
          </p>
        </div>
      </section>

      {/* ─── Try-it demo ─── */}
      <section className="px-5 pb-8 keepsy-rise keepsy-rise-4">
        <LandingTryDemo />
      </section>

      {/* ─── Notes are just the start ─── */}
      <section
        className="px-6 py-16"
        style={{ backgroundColor: "var(--bg-surface)" }}
      >
        <div className="max-w-3xl mx-auto">
          <div className="text-center mb-10">
            <p className="font-label mb-3" style={{ color: "var(--ink-tertiary)" }}>
              more than notes
            </p>
            <h2
              className="font-display text-[28px] sm:text-[34px] mb-3 leading-[1.1]"
              style={{ color: "var(--ink-primary)", letterSpacing: "-0.02em" }}
            >
              Notes are just the start.
            </h2>
            <p
              className="text-[15px] leading-relaxed max-w-md mx-auto"
              style={{ color: "var(--ink-secondary)" }}
            >
              Keepsy also runs your scheduling, reminders, billing, and monthly income &mdash; all
              in one place.
            </p>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 max-w-2xl mx-auto">
            <Tool label="schedule" benefit="what's next, always" icon="calendar" />
            <Tool label="reminders" benefit="auto, per student" icon="bell" />
            <Tool label="billing" benefit="who's due, who paid" icon="card" />
            <Tool label="income" benefit="your month, one number" icon="chart" />
          </div>
        </div>
      </section>

      {/* ─── 3 steps ─── */}
      <section className="px-6 py-14">
        <div className="max-w-md mx-auto grid grid-cols-3 gap-4 text-center">
          <Step n="01" label="talk or type a few lines" />
          <Step n="02" label="Keepsy writes the note" />
          <Step n="03" label="you tap send" />
        </div>
      </section>

      {/* ─── Bottom CTA ─── */}
      <section
        className="px-6 py-16"
        style={{ backgroundColor: "var(--bg-surface)", borderTop: "1px solid var(--line-subtle)" }}
      >
        <div className="max-w-xl mx-auto text-center">
          <h2
            className="font-display text-[28px] sm:text-[34px] mb-6 leading-[1.1]"
            style={{ color: "var(--ink-primary)", letterSpacing: "-0.02em" }}
          >
            Reclaim your evenings.
          </h2>
          <Link href="/login" className="btn-primary h-12 px-7 text-[15px] inline-flex items-center">
            Create your account
          </Link>
          <p className="text-[12.5px] mt-4" style={{ color: "var(--ink-tertiary)" }}>
            your first note is ninety seconds away
          </p>
        </div>
      </section>
    </PublicShell>
  );
}

function Tool({
  label,
  benefit,
  icon,
}: {
  label: string;
  benefit: string;
  icon: "calendar" | "bell" | "card" | "chart";
}) {
  return (
    <div
      className="rounded-[12px] p-4 text-center"
      style={{ backgroundColor: "var(--bg-canvas)", border: "1px solid var(--line-subtle)" }}
    >
      <span className="inline-flex" style={{ color: "var(--accent)" }}>
        <ToolIcon icon={icon} />
      </span>
      <p
        className="text-[13px] font-medium mt-2 mb-0.5"
        style={{ color: "var(--ink-primary)" }}
      >
        {label}
      </p>
      <p className="text-[11.5px] leading-[1.35]" style={{ color: "var(--ink-tertiary)" }}>
        {benefit}
      </p>
    </div>
  );
}

function ToolIcon({ icon }: { icon: "calendar" | "bell" | "card" | "chart" }) {
  const common = {
    width: 20,
    height: 20,
    viewBox: "0 0 24 24",
    fill: "none",
    stroke: "currentColor",
    strokeWidth: 1.7,
    strokeLinecap: "round" as const,
    strokeLinejoin: "round" as const,
    "aria-hidden": true,
  };
  if (icon === "calendar")
    return (
      <svg {...common}>
        <rect x="3" y="4" width="18" height="18" rx="2" />
        <path d="M16 2v4M8 2v4M3 10h18" />
      </svg>
    );
  if (icon === "bell")
    return (
      <svg {...common}>
        <path d="M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9M10.3 21a1.94 1.94 0 0 0 3.4 0" />
      </svg>
    );
  if (icon === "card")
    return (
      <svg {...common}>
        <rect x="2" y="5" width="20" height="14" rx="2" />
        <path d="M2 10h20" />
      </svg>
    );
  return (
    <svg {...common}>
      <path d="M3 3v18h18M7 14l4-4 3 3 5-6" />
    </svg>
  );
}

function Step({ n, label }: { n: string; label: string }) {
  return (
    <div>
      <p className="font-display text-[16px]" style={{ color: "var(--accent)" }}>
        {n}
      </p>
      <p className="text-[12.5px] mt-1.5 leading-[1.45]" style={{ color: "var(--ink-secondary)" }}>
        {label}
      </p>
    </div>
  );
}
