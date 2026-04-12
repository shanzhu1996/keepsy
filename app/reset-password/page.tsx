"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";

export default function ResetPasswordPage() {
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);
  const router = useRouter();
  const supabase = createClient();

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");

    if (password.length < 6) {
      setError("Password must be at least 6 characters");
      return;
    }
    if (password !== confirmPassword) {
      setError("Passwords don't match");
      return;
    }

    setLoading(true);
    try {
      const { error } = await supabase.auth.updateUser({ password });
      if (error) throw error;
      setDone(true);
      // Sign out and redirect to login after 2 seconds
      setTimeout(async () => {
        await supabase.auth.signOut();
        router.push("/login");
      }, 2000);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setLoading(false);
    }
  }

  if (done) {
    return (
      <div className="min-h-dvh flex flex-col items-center justify-center px-6">
        <div className="w-full max-w-sm text-center">
          <div
            className="mx-auto w-14 h-14 rounded-full flex items-center justify-center mb-5 keepsy-rise keepsy-rise-1"
            style={{ backgroundColor: "var(--accent-soft)" }}
          >
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="var(--success)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M20 6 9 17l-5-5" />
            </svg>
          </div>
          <h1
            className="font-display text-[26px] mb-2 keepsy-rise keepsy-rise-2"
            style={{ color: "var(--ink-primary)", letterSpacing: "-0.01em" }}
          >
            password updated
          </h1>
          <p
            className="text-[14px] keepsy-rise keepsy-rise-3"
            style={{ color: "var(--ink-secondary)" }}
          >
            redirecting to login...
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-dvh flex flex-col items-center justify-center px-6">
      <div className="w-full max-w-sm">
        <div className="text-center mb-8 keepsy-rise keepsy-rise-1">
          <h1
            className="font-display text-[34px] mb-1"
            style={{ color: "var(--ink-primary)", letterSpacing: "-0.02em" }}
          >
            new password
          </h1>
          <p className="text-[14px]" style={{ color: "var(--ink-secondary)" }}>
            choose a new password for your account
          </p>
        </div>

        <form onSubmit={handleSubmit} className="keepsy-rise keepsy-rise-2">
          <div className="space-y-3">
            <div>
              <input
                type="password"
                placeholder="new password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                minLength={6}
                autoComplete="new-password"
                autoFocus
                className="w-full h-11 px-3 text-[14px] rounded-[10px] outline-none transition-colors"
                style={{
                  backgroundColor: "var(--bg-surface)",
                  border: "1px solid var(--line-strong)",
                  color: "var(--ink-primary)",
                }}
                onFocus={(e) => (e.currentTarget.style.borderColor = "var(--accent)")}
                onBlur={(e) => (e.currentTarget.style.borderColor = "var(--line-strong)")}
              />
              <p className="text-[11px] mt-1.5 ml-1" style={{ color: "var(--ink-tertiary)" }}>
                at least 6 characters
              </p>
            </div>

            <input
              type="password"
              placeholder="confirm password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              required
              minLength={6}
              autoComplete="new-password"
              className="w-full h-11 px-3 text-[14px] rounded-[10px] outline-none transition-colors"
              style={{
                backgroundColor: "var(--bg-surface)",
                border: "1px solid var(--line-strong)",
                color: "var(--ink-primary)",
              }}
              onFocus={(e) => (e.currentTarget.style.borderColor = "var(--accent)")}
              onBlur={(e) => (e.currentTarget.style.borderColor = "var(--line-strong)")}
            />
          </div>

          {error && (
            <div
              className="mt-3 px-3 py-2.5 rounded-[10px] text-[13px]"
              style={{
                backgroundColor: "var(--accent-soft)",
                color: "var(--danger)",
                border: "1px solid rgba(179, 50, 31, 0.12)",
              }}
            >
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full h-11 mt-4 text-[14px] font-semibold rounded-[10px] transition-colors"
            style={{
              backgroundColor: loading ? "var(--bg-muted)" : "var(--accent)",
              color: loading ? "var(--ink-tertiary)" : "#fff",
              boxShadow: loading ? "none" : "var(--shadow-cta)",
              letterSpacing: "-0.005em",
            }}
          >
            {loading ? "..." : "update password"}
          </button>
        </form>
      </div>
    </div>
  );
}
