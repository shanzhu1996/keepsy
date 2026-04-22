import Link from "next/link";

export function PublicShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-dvh flex flex-col" style={{ backgroundColor: "var(--bg-canvas)" }}>
      <header className="w-full border-b" style={{ borderColor: "var(--line-subtle)" }}>
        <div className="max-w-5xl mx-auto flex items-center justify-between px-6 py-5">
          <Link
            href="/"
            className="font-display text-[22px]"
            style={{ color: "var(--ink-primary)", letterSpacing: "-0.01em" }}
          >
            keepsy
          </Link>
          <nav className="flex items-center gap-5 text-[14px]" style={{ color: "var(--ink-secondary)" }}>
            <Link href="/login" className="hover:underline" style={{ textUnderlineOffset: 3 }}>
              log in
            </Link>
            <Link
              href="/login"
              className="h-9 px-4 inline-flex items-center rounded-[10px] text-[13px] font-semibold"
              style={{ backgroundColor: "var(--accent)", color: "#fff", boxShadow: "var(--shadow-cta)" }}
            >
              get started
            </Link>
          </nav>
        </div>
      </header>

      <main className="flex-1">{children}</main>

      <footer
        className="border-t px-6 py-10"
        style={{ borderColor: "var(--line-subtle)", backgroundColor: "var(--bg-surface)" }}
      >
        <div className="max-w-5xl mx-auto flex flex-col sm:flex-row items-start sm:items-center justify-between gap-6">
          <div>
            <p className="font-display text-[18px] mb-1" style={{ color: "var(--ink-primary)" }}>
              keepsy
            </p>
            <p className="text-[13px]" style={{ color: "var(--ink-tertiary)" }}>
              The admin side of private teaching, handled.
            </p>
            <p className="text-[13px] mt-2" style={{ color: "var(--ink-tertiary)" }}>
              Contact:{" "}
              <a
                href="mailto:shanzhu1996@gmail.com"
                className="contact-link"
                style={{ color: "var(--ink-secondary)" }}
              >
                shanzhu1996@gmail.com
              </a>
            </p>
          </div>
          <nav className="flex flex-wrap gap-5 text-[13px]" style={{ color: "var(--ink-secondary)" }}>
            <Link href="/privacy" className="hover:underline" style={{ textUnderlineOffset: 3 }}>
              Privacy Policy
            </Link>
            <Link href="/terms" className="hover:underline" style={{ textUnderlineOffset: 3 }}>
              Terms of Service
            </Link>
            <Link href="/sms-policy" className="hover:underline" style={{ textUnderlineOffset: 3 }}>
              SMS Policy
            </Link>
          </nav>
        </div>
      </footer>
    </div>
  );
}

export function LegalPage({
  title,
  updated,
  children,
}: {
  title: string;
  updated: string;
  children: React.ReactNode;
}) {
  return (
    <PublicShell>
      <article className="max-w-2xl mx-auto px-6 py-16">
        <h1
          className="font-display text-[40px] mb-3 keepsy-rise keepsy-rise-1"
          style={{ color: "var(--ink-primary)", letterSpacing: "-0.02em" }}
        >
          {title}
        </h1>
        <p
          className="text-[13px] mb-10 keepsy-rise keepsy-rise-2"
          style={{ color: "var(--ink-tertiary)" }}
        >
          Last updated: {updated}
        </p>
        <div
          className="legal-body keepsy-rise keepsy-rise-3"
          style={{ color: "var(--ink-secondary)" }}
        >
          {children}
        </div>
      </article>
    </PublicShell>
  );
}
