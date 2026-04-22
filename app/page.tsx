import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { PublicShell } from "@/components/public-shell";
import { TodayMockup, NoteMockup } from "@/components/landing-mockups";

export default async function Home() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (user) {
    redirect("/today");
  }

  const subjects = [
    "Piano",
    "Violin",
    "Voice",
    "Guitar",
    "Languages",
    "Math & academic",
    "Dance",
    "Yoga",
    "Art",
    "Coaching",
  ];

  return (
    <PublicShell>
      {/* Hero */}
      <section className="flex items-center justify-center px-6 py-20 sm:py-24">
        <div className="max-w-2xl text-center">
          <p
            className="font-label keepsy-rise keepsy-rise-1 mb-6"
            style={{ color: "var(--accent)" }}
          >
            for private lesson teachers
          </p>
          <h1
            className="font-display text-[44px] sm:text-[60px] leading-[1.02] mb-6 keepsy-rise keepsy-rise-2"
            style={{ color: "var(--ink-primary)", letterSpacing: "-0.02em" }}
          >
            Teach more.<br />
            Type less.
          </h1>
          <p
            className="text-[17px] leading-relaxed mb-10 keepsy-rise keepsy-rise-3 max-w-xl mx-auto"
            style={{ color: "var(--ink-secondary)" }}
          >
            Keep your teaching easy peasy. Schedules, lesson notes, auto
            reminders, billing cycles, and monthly income &mdash; all in one
            place.
          </p>
          <div className="flex items-center justify-center gap-3 keepsy-rise keepsy-rise-4">
            <Link href="/login" className="btn-primary h-12 px-6 text-[15px]">
              create an account
            </Link>
            <Link href="/login" className="btn-secondary h-12 px-6 text-[15px]">
              log in
            </Link>
          </div>
        </div>
      </section>

      {/* Featured section — Schedule + Lesson notes with mockups */}
      <section
        className="px-6 py-20"
        style={{ backgroundColor: "var(--bg-surface)" }}
      >
        <div className="max-w-5xl mx-auto">
          <p
            className="font-label text-center mb-4"
            style={{ color: "var(--ink-tertiary)" }}
          >
            what keepsy does
          </p>
          <h2
            className="font-display text-[32px] sm:text-[40px] text-center mb-20 leading-[1.1]"
            style={{ color: "var(--ink-primary)", letterSpacing: "-0.02em" }}
          >
            Five quiet tools,<br />one calm studio.
          </h2>

          {/* Feature 01 — Schedule + TodayMockup */}
          <div className="grid md:grid-cols-2 gap-10 md:gap-16 items-center mb-24">
            <div>
              <p className="font-label mb-3" style={{ color: "var(--accent)" }}>
                01 &middot; schedule
              </p>
              <h3
                className="text-[26px] sm:text-[30px] font-medium mb-4 leading-[1.15]"
                style={{ color: "var(--ink-primary)", letterSpacing: "-0.01em" }}
              >
                Know what&apos;s next.<br />Always.
              </h3>
              <p className="text-[16px] leading-relaxed" style={{ color: "var(--ink-secondary)" }}>
                One glance shows what&apos;s happening now, what&apos;s up
                next, and what&apos;s done. No refreshing calendars between
                students.
              </p>
            </div>
            <div>
              <TodayMockup />
            </div>
          </div>

          {/* Feature 02 — Lesson notes + NoteMockup */}
          <div className="grid md:grid-cols-2 gap-10 md:gap-16 items-center">
            <div className="order-2 md:order-1">
              <NoteMockup />
            </div>
            <div className="order-1 md:order-2">
              <p className="font-label mb-3" style={{ color: "var(--accent)" }}>
                02 &middot; lesson notes
              </p>
              <h3
                className="text-[26px] sm:text-[30px] font-medium mb-4 leading-[1.15]"
                style={{ color: "var(--ink-primary)", letterSpacing: "-0.01em" }}
              >
                Ninety seconds,<br />not thirty minutes.
              </h3>
              <p className="text-[16px] leading-relaxed" style={{ color: "var(--ink-secondary)" }}>
                Talk or type a few lines after class. Keepsy writes the
                parent-ready report &mdash; in 8 languages. You hit send.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Features 03, 04, 05 */}
      <section className="px-6 py-20">
        <div className="max-w-5xl mx-auto grid md:grid-cols-3 gap-10">
          <SmallFeature
            number="03"
            label="auto reminders"
            title="Stop the Sunday-night group text."
            body="One switch per student. Keepsy texts or emails them before each lesson — so you never chase again."
          />
          <SmallFeature
            number="04"
            label="billing cycles"
            title="Know who's behind, without the spreadsheet."
            body="Set your cycle length. Keepsy flags who's due, logs who's paid, and stays out of your way."
          />
          <SmallFeature
            number="05"
            label="monthly income"
            title="Your month, in one number."
            body="This month's total, any past month — ready for taxes, planning, or just a satisfying look."
          />
        </div>
      </section>

      {/* Works for any subject */}
      <section
        className="px-6 py-20"
        style={{ backgroundColor: "var(--bg-surface)" }}
      >
        <div className="max-w-3xl mx-auto text-center">
          <p className="font-label mb-4" style={{ color: "var(--ink-tertiary)" }}>
            works for any subject
          </p>
          <h2
            className="font-display text-[32px] sm:text-[40px] mb-6 leading-[1.1]"
            style={{ color: "var(--ink-primary)", letterSpacing: "-0.02em" }}
          >
            Built for every<br />private lesson teacher.
          </h2>
          <p className="text-[16px] leading-relaxed mb-10" style={{ color: "var(--ink-secondary)" }}>
            Piano, violin, voice, guitar, language tutoring, math, dance,
            yoga, art, coaching &mdash; if you teach one-on-one, Keepsy
            handles the admin so you don&apos;t have to.
          </p>
          <div className="flex flex-wrap justify-center gap-2 max-w-2xl mx-auto">
            {subjects.map((s) => (
              <span key={s} className="subject-chip">
                {s}
              </span>
            ))}
          </div>
        </div>
      </section>

      {/* Bottom CTA */}
      <section className="px-6 py-20">
        <div className="max-w-2xl mx-auto text-center">
          <h2
            className="font-display text-[32px] sm:text-[40px] mb-5 leading-[1.1]"
            style={{ color: "var(--ink-primary)", letterSpacing: "-0.02em" }}
          >
            Ready to reclaim<br />your evenings?
          </h2>
          <p className="text-[16px] leading-relaxed mb-8" style={{ color: "var(--ink-secondary)" }}>
            Create an account in under a minute. No credit card.
          </p>
          <Link href="/login" className="btn-primary h-12 px-7 text-[15px]">
            create an account
          </Link>
        </div>
      </section>
    </PublicShell>
  );
}

function SmallFeature({
  number,
  label,
  title,
  body,
}: {
  number: string;
  label: string;
  title: string;
  body: string;
}) {
  return (
    <div>
      <p className="font-label mb-3" style={{ color: "var(--accent)" }}>
        {number} &middot; {label}
      </p>
      <h3
        className="text-[20px] font-medium mb-3 leading-[1.3]"
        style={{ color: "var(--ink-primary)", letterSpacing: "-0.005em" }}
      >
        {title}
      </h3>
      <p className="text-[15px] leading-relaxed" style={{ color: "var(--ink-secondary)" }}>
        {body}
      </p>
    </div>
  );
}
