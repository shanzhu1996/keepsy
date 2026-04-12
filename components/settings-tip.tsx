"use client";

import { useState, useEffect } from "react";
import Link from "next/link";

/**
 * One-time tip shown after first student with billing is created.
 * Suggests setting defaults in Settings. Dismisses permanently.
 */
export default function SettingsTip({ hasBilling }: { hasBilling: boolean }) {
  const [show, setShow] = useState(false);

  useEffect(() => {
    if (!hasBilling) return;
    const key = "keepsy:settings-tip-shown";
    if (localStorage.getItem(key)) return;
    setShow(true);
    localStorage.setItem(key, "1");
  }, [hasBilling]);

  if (!show) return null;

  return (
    <div
      className="rounded-[var(--radius)] px-4 py-3 mb-4 flex items-start gap-3"
      style={{
        backgroundColor: "var(--accent-soft)",
        border: "1px solid rgba(165, 82, 42, 0.12)",
      }}
    >
      <p className="flex-1 text-[13px]" style={{ color: "var(--accent-ink)", lineHeight: 1.5 }}>
        <span className="font-medium">tip:</span> you can set default billing in{" "}
        <Link
          href="/settings"
          className="font-medium underline"
          style={{ textUnderlineOffset: "3px", color: "var(--accent)" }}
        >
          Settings
        </Link>{" "}
        so it pre-fills for new students
      </p>
      <button
        type="button"
        onClick={() => setShow(false)}
        className="shrink-0 text-[14px]"
        style={{ color: "var(--accent-ink)", opacity: 0.5 }}
      >
        ×
      </button>
    </div>
  );
}
